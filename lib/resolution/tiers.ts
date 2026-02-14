import type { TwitterUser } from "../twitter/types";
import { searchUsers, checkProfileExists } from "../goodreads/index";

export interface ResolutionResult {
  goodreadsUserId: string;
  confidence: number;
  method: "linked_url" | "email" | "fuzzy_name" | "username" | "manual";
}

/**
 * Tier 1: Check for Goodreads URLs in the Twitter profile bio and entities.
 * Confidence: 0.95
 */
export function tierLinkedUrl(
  profile: TwitterUser
): ResolutionResult | null {
  const urls: string[] = [];

  if (profile.entities?.url?.urls) {
    urls.push(...profile.entities.url.urls.map((u) => u.expanded_url));
  }
  if (profile.entities?.description?.urls) {
    urls.push(
      ...profile.entities.description.urls.map((u) => u.expanded_url)
    );
  }

  // Also check raw bio text for URLs
  const bio = profile.description || "";
  const bioUrlMatches = bio.match(
    /goodreads\.com\/(user\/show\/\d+|author\/show\/\d+|[a-zA-Z0-9_-]+)/g
  );
  if (bioUrlMatches) {
    urls.push(...bioUrlMatches.map((m) => `https://www.${m}`));
  }

  for (const url of urls) {
    // Match goodreads.com/user/show/12345
    const userIdMatch = url.match(
      /goodreads\.com\/user\/show\/(\d+)/
    );
    if (userIdMatch) {
      return {
        goodreadsUserId: userIdMatch[1],
        confidence: 0.95,
        method: "linked_url",
      };
    }

    // Match goodreads.com/author/show/12345
    const authorIdMatch = url.match(
      /goodreads\.com\/author\/show\/(\d+)/
    );
    if (authorIdMatch) {
      return {
        goodreadsUserId: authorIdMatch[1],
        confidence: 0.95,
        method: "linked_url",
      };
    }
  }

  return null;
}

/**
 * Tier 2: Match by email if we have it from both platforms.
 * Confidence: 0.90
 */
export async function tierEmail(
  _profile: TwitterUser,
  email?: string
): Promise<ResolutionResult | null> {
  if (!email) return null;

  // Search Goodreads by email — the search endpoint can sometimes
  // find users by their email address.
  const results = await searchUsers(email);

  if (results.length === 1) {
    return {
      goodreadsUserId: results[0].id,
      confidence: 0.9,
      method: "email",
    };
  }

  return null;
}

/**
 * Tier 3: Fuzzy name matching.
 * Normalize display name and search Goodreads.
 * Confidence: 0.4 to 0.7
 */
export async function tierFuzzyName(
  profile: TwitterUser
): Promise<ResolutionResult | null> {
  const rawName = profile.name || "";

  // Normalize: lowercase, strip emojis, strip special chars
  // Strip emojis and special characters, normalize to lowercase
  const normalizedName = rawName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toLowerCase();

  if (!normalizedName || normalizedName.length < 2) return null;

  const results = await searchUsers(normalizedName);

  if (results.length === 0) return null;

  // Score each result
  let bestMatch: { user: (typeof results)[0]; score: number } | null = null;

  for (const user of results) {
    let score = 0.4; // base score

    const normalizedGrName = user.name.toLowerCase().replace(/[^\w\s]/g, "").trim();

    // Exact name match
    if (normalizedGrName === normalizedName) {
      score += 0.2;
    }
    // Partial name match (first name + last name)
    else if (
      normalizedGrName.includes(normalizedName) ||
      normalizedName.includes(normalizedGrName)
    ) {
      score += 0.1;
    }

    // Location overlap
    if (
      profile.description &&
      user.location &&
      profile.description
        .toLowerCase()
        .includes(user.location.toLowerCase())
    ) {
      score += 0.1;
    }

    // Bio keyword overlap — check if Goodreads user's profile
    // matches bookish signals in the Twitter bio
    const twitterBio = (profile.description || "").toLowerCase();
    if (
      twitterBio.includes("book") ||
      twitterBio.includes("read") ||
      twitterBio.includes("author")
    ) {
      score += 0.05;
    }

    score = Math.min(score, 0.7); // cap at 0.7 for fuzzy

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { user, score };
    }
  }

  if (bestMatch && bestMatch.score >= 0.4) {
    return {
      goodreadsUserId: bestMatch.user.id,
      confidence: bestMatch.score,
      method: "fuzzy_name",
    };
  }

  return null;
}

/**
 * Tier 4: Username match.
 * Try goodreads.com/{twitter_handle} and see if it resolves.
 * Confidence: 0.6
 */
export async function tierUsername(
  profile: TwitterUser
): Promise<ResolutionResult | null> {
  const username = profile.username;
  if (!username) return null;

  const result = await checkProfileExists(username);

  if (result.exists && result.userId) {
    return {
      goodreadsUserId: result.userId,
      confidence: 0.6,
      method: "username",
    };
  }

  return null;
}

/**
 * Tier 5: Manual resolution.
 * Returns null to indicate the user should be prompted.
 */
export function tierManual(): ResolutionResult | null {
  return null;
}
