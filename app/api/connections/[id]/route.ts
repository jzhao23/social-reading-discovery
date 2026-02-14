import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  socialConnections,
  socialGraphImports,
  resolutionCache,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { queueActivityJob } from "@/lib/jobs/queue";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectionId = params.id;
  const body = await request.json();
  const { action, goodreadsUserId } = body as {
    action: "confirm" | "reject" | "manual_link";
    goodreadsUserId?: string;
  };

  // Verify the connection belongs to the user
  const connection = await db.query.socialConnections.findFirst({
    where: eq(socialConnections.id, connectionId),
    with: { import: true },
  });

  if (!connection || connection.import.userId !== session.userId) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 }
    );
  }

  switch (action) {
    case "confirm": {
      // Confirm an existing match
      await db
        .update(socialConnections)
        .set({ verifiedByUser: true })
        .where(eq(socialConnections.id, connectionId));

      // Update resolution cache confidence
      if (connection.goodreadsUserId) {
        await db
          .insert(resolutionCache)
          .values({
            sourcePlatform: connection.sourcePlatform,
            sourceUserId: connection.sourceUserId,
            goodreadsUserId: connection.goodreadsUserId,
            confidence: 1.0,
            method: connection.matchMethod || "manual",
            lastVerifiedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              resolutionCache.sourcePlatform,
              resolutionCache.sourceUserId,
            ],
            set: {
              confidence: 1.0,
              lastVerifiedAt: new Date(),
            },
          });
      }

      return NextResponse.json({ status: "confirmed" });
    }

    case "reject": {
      // Remove the match
      await db
        .update(socialConnections)
        .set({
          goodreadsUserId: null,
          matchConfidence: 0,
          matchMethod: null,
          verifiedByUser: false,
        })
        .where(eq(socialConnections.id, connectionId));

      // Decrement matched count
      await db
        .update(socialGraphImports)
        .set({
          matchedAccounts: sql`GREATEST(${socialGraphImports.matchedAccounts} - 1, 0)`,
        })
        .where(eq(socialGraphImports.id, connection.importId));

      return NextResponse.json({ status: "rejected" });
    }

    case "manual_link": {
      if (!goodreadsUserId) {
        return NextResponse.json(
          { error: "goodreadsUserId is required for manual linking" },
          { status: 400 }
        );
      }

      // Set the manual link
      await db
        .update(socialConnections)
        .set({
          goodreadsUserId,
          matchConfidence: 1.0,
          matchMethod: "manual",
          verifiedByUser: true,
        })
        .where(eq(socialConnections.id, connectionId));

      // Update resolution cache
      await db
        .insert(resolutionCache)
        .values({
          sourcePlatform: connection.sourcePlatform,
          sourceUserId: connection.sourceUserId,
          goodreadsUserId,
          confidence: 1.0,
          method: "manual",
          lastVerifiedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            resolutionCache.sourcePlatform,
            resolutionCache.sourceUserId,
          ],
          set: {
            goodreadsUserId,
            confidence: 1.0,
            method: "manual",
            lastVerifiedAt: new Date(),
          },
        });

      // Increment matched count
      if (!connection.goodreadsUserId) {
        await db
          .update(socialGraphImports)
          .set({
            matchedAccounts: sql`${socialGraphImports.matchedAccounts} + 1`,
          })
          .where(eq(socialGraphImports.id, connection.importId));
      }

      // Queue activity fetch for the new link
      await queueActivityJob({
        connectionId,
        goodreadsUserId,
      });

      return NextResponse.json({ status: "linked" });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
  }
}
