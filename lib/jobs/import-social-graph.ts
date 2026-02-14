import { eq } from "drizzle-orm";
import { db } from "../db";
import { socialGraphImports, socialConnections } from "../db/schema";
import { fetchFollowing } from "../twitter/client";
import { queueResolveJob } from "./queue";
import type { ImportJobData } from "./queue";

/**
 * Process a social graph import job.
 *
 * 1. Fetch the following list from Twitter
 * 2. Create social_connections rows for each account
 * 3. Queue resolution jobs for each connection
 */
export async function processImportJob(data: ImportJobData): Promise<void> {
  const { importId, sourceAccountId, accessToken } = data;

  // Mark import as processing
  await db
    .update(socialGraphImports)
    .set({ status: "processing" })
    .where(eq(socialGraphImports.id, importId));

  try {
    // Fetch all following accounts from Twitter
    const following = await fetchFollowing(sourceAccountId, accessToken);

    // Update total count
    await db
      .update(socialGraphImports)
      .set({ totalAccounts: following.length })
      .where(eq(socialGraphImports.id, importId));

    // Create social connection rows and queue resolution jobs
    for (const account of following) {
      // Build profile URL
      const profileUrl = `https://x.com/${account.username}`;

      // Insert social connection
      const [connection] = await db
        .insert(socialConnections)
        .values({
          importId,
          sourcePlatform: "twitter",
          sourceUserId: account.id,
          sourceHandle: account.username,
          sourceDisplayName: account.name,
          sourceBio: account.description || null,
          sourceProfileUrl: profileUrl,
          // If we already found a Goodreads link, pre-populate
          goodreadsUserId: null,
          matchConfidence: 0,
          matchMethod: null,
        })
        .returning();

      // Queue resolution job
      await queueResolveJob({
        connectionId: connection.id,
        importId,
      });
    }

    // Mark import as complete (individual connections will be resolved async)
    await db
      .update(socialGraphImports)
      .set({ status: "complete", lastRefreshedAt: new Date() })
      .where(eq(socialGraphImports.id, importId));
  } catch (error) {
    console.error(`Import job failed for ${importId}:`, error);

    await db
      .update(socialGraphImports)
      .set({ status: "failed" })
      .where(eq(socialGraphImports.id, importId));

    throw error;
  }
}
