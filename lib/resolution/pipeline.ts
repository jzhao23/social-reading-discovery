import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { resolutionCache } from "../db/schema";
import type { TwitterUser } from "../twitter/types";
import {
  tierLinkedUrl,
  tierEmail,
  tierFuzzyName,
  tierUsername,
  type ResolutionResult,
} from "./tiers";

const CACHE_VALIDITY_DAYS = 30;

/**
 * Check the resolution cache for a previously resolved mapping.
 */
async function checkCache(
  sourcePlatform: "twitter",
  sourceUserId: string
): Promise<ResolutionResult | null> {
  try {
    const cached = await db.query.resolutionCache.findFirst({
      where: and(
        eq(resolutionCache.sourcePlatform, sourcePlatform),
        eq(resolutionCache.sourceUserId, sourceUserId)
      ),
    });

    if (!cached) return null;

    // Check if cache is still valid (within 30 days)
    const age = Date.now() - cached.lastVerifiedAt.getTime();
    const maxAge = CACHE_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

    if (age > maxAge) return null;

    return {
      goodreadsUserId: cached.goodreadsUserId,
      confidence: cached.confidence,
      method: cached.method,
    };
  } catch (error) {
    console.error("Resolution cache lookup failed:", error);
    return null;
  }
}

/**
 * Save a resolution result to the global cache.
 */
async function saveToCache(
  sourcePlatform: "twitter",
  sourceUserId: string,
  result: ResolutionResult
): Promise<void> {
  try {
    await db
      .insert(resolutionCache)
      .values({
        sourcePlatform,
        sourceUserId,
        goodreadsUserId: result.goodreadsUserId,
        confidence: result.confidence,
        method: result.method,
        lastVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [resolutionCache.sourcePlatform, resolutionCache.sourceUserId],
        set: {
          goodreadsUserId: result.goodreadsUserId,
          confidence: result.confidence,
          method: result.method,
          lastVerifiedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Failed to save resolution cache:", error);
  }
}

/**
 * Main resolution pipeline.
 *
 * Runs through 5 tiers of identity resolution, from highest confidence
 * to lowest. Returns the first successful match.
 *
 * @param twitterProfile - The Twitter profile to resolve
 * @param email - Optional email for Tier 2 matching
 * @returns Resolution result or null if no match found
 */
export async function resolve(
  twitterProfile: TwitterUser,
  email?: string
): Promise<ResolutionResult | null> {
  // Check cache first
  const cached = await checkCache("twitter", twitterProfile.id);
  if (cached) {
    console.log(
      `Cache hit for @${twitterProfile.username}: Goodreads ${cached.goodreadsUserId} (${cached.method}, ${cached.confidence})`
    );
    return cached;
  }

  // Tier 1: Linked URLs (synchronous, no API calls needed)
  const tier1 = tierLinkedUrl(twitterProfile);
  if (tier1) {
    console.log(
      `Tier 1 match for @${twitterProfile.username}: ${tier1.goodreadsUserId}`
    );
    await saveToCache("twitter", twitterProfile.id, tier1);
    return tier1;
  }

  // Tier 2: Email match
  const tier2 = await tierEmail(twitterProfile, email);
  if (tier2) {
    console.log(
      `Tier 2 match for @${twitterProfile.username}: ${tier2.goodreadsUserId}`
    );
    await saveToCache("twitter", twitterProfile.id, tier2);
    return tier2;
  }

  // Tier 3: Fuzzy name matching
  const tier3 = await tierFuzzyName(twitterProfile);
  if (tier3) {
    console.log(
      `Tier 3 match for @${twitterProfile.username}: ${tier3.goodreadsUserId} (confidence: ${tier3.confidence})`
    );
    await saveToCache("twitter", twitterProfile.id, tier3);
    return tier3;
  }

  // Tier 4: Username match
  const tier4 = await tierUsername(twitterProfile);
  if (tier4) {
    console.log(
      `Tier 4 match for @${twitterProfile.username}: ${tier4.goodreadsUserId}`
    );
    await saveToCache("twitter", twitterProfile.id, tier4);
    return tier4;
  }

  // Tier 5: Manual — no automatic resolution possible
  console.log(
    `No automatic match for @${twitterProfile.username}, flagged for manual review`
  );
  return null;
}
