import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { socialConnections, socialGraphImports } from "../db/schema";
import { resolve } from "../resolution/pipeline";
import { queueActivityJob } from "./queue";
import type { ResolveJobData } from "./queue";
import type { TwitterUser } from "../twitter/types";

/**
 * Process a single connection resolution job.
 *
 * 1. Load the social connection data
 * 2. Build a TwitterUser profile from stored data
 * 3. Run through the resolution pipeline
 * 4. Update the connection row
 * 5. If resolved, queue an activity fetch job
 */
export async function processResolveJob(data: ResolveJobData): Promise<void> {
  const { connectionId, importId } = data;

  const connection = await db.query.socialConnections.findFirst({
    where: eq(socialConnections.id, connectionId),
  });

  if (!connection) {
    console.error(`Connection ${connectionId} not found`);
    return;
  }

  // Build a TwitterUser-like object from stored data
  const twitterProfile: TwitterUser = {
    id: connection.sourceUserId,
    name: connection.sourceDisplayName || "",
    username: connection.sourceHandle || "",
    description: connection.sourceBio || undefined,
  };

  // Parse any URLs from the bio for the resolution pipeline
  if (connection.sourceBio) {
    const urlMatches = connection.sourceBio.match(
      /https?:\/\/[^\s]+/g
    );
    if (urlMatches) {
      twitterProfile.entities = {
        description: {
          urls: urlMatches.map((url) => ({
            start: 0,
            end: 0,
            url,
            expanded_url: url,
            display_url: url,
          })),
        },
      };
    }
  }

  // Run resolution pipeline
  const result = await resolve(twitterProfile);

  if (result) {
    // Update connection with resolution result
    await db
      .update(socialConnections)
      .set({
        goodreadsUserId: result.goodreadsUserId,
        matchConfidence: result.confidence,
        matchMethod: result.method,
      })
      .where(eq(socialConnections.id, connectionId));

    // Increment matched count on the import
    await db
      .update(socialGraphImports)
      .set({
        matchedAccounts: sql`${socialGraphImports.matchedAccounts} + 1`,
      })
      .where(eq(socialGraphImports.id, importId));

    // Queue activity fetch
    await queueActivityJob({
      connectionId,
      goodreadsUserId: result.goodreadsUserId,
    });
  }
}
