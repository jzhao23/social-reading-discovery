import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  socialFeedItems,
  socialConnections,
  socialGraphImports,
} from "@/lib/db/schema";
import { eq, and, desc, gte, inArray, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;
  const timeRange = searchParams.get("timeRange") || "all";
  const activityType = searchParams.get("activityType");
  const personId = searchParams.get("personId");

  // Get all import IDs for this user
  const imports = await db.query.socialGraphImports.findMany({
    where: eq(socialGraphImports.userId, session.userId),
    columns: { id: true },
  });

  if (imports.length === 0) {
    return NextResponse.json({ items: [], total: 0, page, limit });
  }

  const importIds = imports.map((i) => i.id);

  // Get all resolved connections for this user's imports
  const connections = await db.query.socialConnections.findMany({
    where: and(
      inArray(socialConnections.importId, importIds),
      sql`${socialConnections.goodreadsUserId} IS NOT NULL`
    ),
  });

  if (connections.length === 0) {
    return NextResponse.json({ items: [], total: 0, page, limit });
  }

  const connectionIds = connections.map((c) => c.id);

  // Build time range filter
  let dateFilter: Date | undefined;
  if (timeRange === "week") {
    dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "month") {
    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "year") {
    dateFilter = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  }

  // Build where conditions
  const conditions = [inArray(socialFeedItems.connectionId, connectionIds)];

  if (dateFilter) {
    conditions.push(gte(socialFeedItems.activityDate, dateFilter));
  }

  if (activityType) {
    const validTypes = [
      "currently_reading",
      "read",
      "rating",
      "review",
      "shelved",
      "recommendation",
    ] as const;
    if (validTypes.includes(activityType as (typeof validTypes)[number])) {
      conditions.push(
        eq(
          socialFeedItems.activityType,
          activityType as (typeof validTypes)[number]
        )
      );
    }
  }

  if (personId) {
    conditions.push(eq(socialFeedItems.connectionId, personId));
  }

  // Fetch feed items
  const items = await db.query.socialFeedItems.findMany({
    where: and(...conditions),
    orderBy: desc(socialFeedItems.activityDate),
    limit,
    offset,
    with: {
      connection: true,
    },
  });

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(socialFeedItems)
    .where(and(...conditions));

  const total = Number(countResult[0]?.count || 0);

  // Map items with connection info
  const feedItems = items.map((item) => ({
    id: item.id,
    activityType: item.activityType,
    book: {
      id: item.bookId,
      title: item.bookTitle,
      author: item.bookAuthor,
      coverUrl: item.bookCoverUrl,
    },
    rating: item.rating,
    reviewSnippet: item.reviewSnippet,
    activityDate: item.activityDate,
    person: {
      connectionId: item.connection.id,
      handle: item.connection.sourceHandle,
      displayName: item.connection.sourceDisplayName,
      profileUrl: item.connection.sourceProfileUrl,
      goodreadsUserId: item.connection.goodreadsUserId,
    },
  }));

  return NextResponse.json({
    items: feedItems,
    total,
    page,
    limit,
    hasMore: offset + limit < total,
  });
}
