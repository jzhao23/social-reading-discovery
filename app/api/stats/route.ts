import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  socialGraphImports,
  socialConnections,
  socialFeedItems,
} from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all imports for this user
  const imports = await db.query.socialGraphImports.findMany({
    where: eq(socialGraphImports.userId, session.userId),
  });

  if (imports.length === 0) {
    return NextResponse.json({
      totalImports: 0,
      totalAccounts: 0,
      totalMatched: 0,
      matchRate: 0,
      totalFeedItems: 0,
      uniqueBooks: 0,
    });
  }

  const importIds = imports.map((i) => i.id);

  const totalAccounts = imports.reduce(
    (sum, i) => sum + (i.totalAccounts || 0),
    0
  );
  const totalMatched = imports.reduce(
    (sum, i) => sum + (i.matchedAccounts || 0),
    0
  );

  // Get connection IDs for feed stats
  const connections = await db.query.socialConnections.findMany({
    where: and(
      inArray(socialConnections.importId, importIds),
      sql`${socialConnections.goodreadsUserId} IS NOT NULL`
    ),
    columns: { id: true },
  });

  let totalFeedItems = 0;
  let uniqueBooks = 0;

  if (connections.length > 0) {
    const connectionIds = connections.map((c) => c.id);

    const feedStats = await db
      .select({
        totalItems: sql<number>`count(*)`,
        uniqueBooks: sql<number>`count(distinct ${socialFeedItems.bookId})`,
      })
      .from(socialFeedItems)
      .where(inArray(socialFeedItems.connectionId, connectionIds));

    totalFeedItems = Number(feedStats[0]?.totalItems || 0);
    uniqueBooks = Number(feedStats[0]?.uniqueBooks || 0);
  }

  return NextResponse.json({
    totalImports: imports.length,
    totalAccounts,
    totalMatched,
    matchRate:
      totalAccounts > 0
        ? Math.round((totalMatched / totalAccounts) * 100)
        : 0,
    totalFeedItems,
    uniqueBooks,
  });
}
