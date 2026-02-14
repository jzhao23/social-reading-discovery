import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  socialFeedItems,
  socialConnections,
  socialGraphImports,
} from "@/lib/db/schema";
import { eq, and, gte, inArray, sql, desc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all import IDs for this user
  const imports = await db.query.socialGraphImports.findMany({
    where: eq(socialGraphImports.userId, session.userId),
    columns: { id: true },
  });

  if (imports.length === 0) {
    return NextResponse.json({ trending: [] });
  }

  const importIds = imports.map((i) => i.id);

  // Get resolved connections
  const connections = await db.query.socialConnections.findMany({
    where: and(
      inArray(socialConnections.importId, importIds),
      sql`${socialConnections.goodreadsUserId} IS NOT NULL`
    ),
    columns: { id: true },
  });

  if (connections.length === 0) {
    return NextResponse.json({ trending: [] });
  }

  const connectionIds = connections.map((c) => c.id);

  // Find books with 2+ interactions in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const trending = await db
    .select({
      bookId: socialFeedItems.bookId,
      bookTitle: socialFeedItems.bookTitle,
      bookAuthor: socialFeedItems.bookAuthor,
      bookCoverUrl: socialFeedItems.bookCoverUrl,
      interactionCount: sql<number>`count(distinct ${socialFeedItems.connectionId})`,
      avgRating: sql<number>`avg(${socialFeedItems.rating})`,
    })
    .from(socialFeedItems)
    .where(
      and(
        inArray(socialFeedItems.connectionId, connectionIds),
        gte(socialFeedItems.activityDate, thirtyDaysAgo)
      )
    )
    .groupBy(
      socialFeedItems.bookId,
      socialFeedItems.bookTitle,
      socialFeedItems.bookAuthor,
      socialFeedItems.bookCoverUrl
    )
    .having(sql`count(distinct ${socialFeedItems.connectionId}) >= 2`)
    .orderBy(desc(sql`count(distinct ${socialFeedItems.connectionId})`))
    .limit(10);

  return NextResponse.json({
    trending: trending.map((t) => ({
      book: {
        id: t.bookId,
        title: t.bookTitle,
        author: t.bookAuthor,
        coverUrl: t.bookCoverUrl,
      },
      interactionCount: Number(t.interactionCount),
      avgRating: t.avgRating ? Math.round(Number(t.avgRating) * 10) / 10 : null,
    })),
  });
}
