import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { socialGraphImports, socialConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const importId = params.id;

  const importRecord = await db.query.socialGraphImports.findFirst({
    where: and(
      eq(socialGraphImports.id, importId),
      eq(socialGraphImports.userId, session.userId)
    ),
  });

  if (!importRecord) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  // Get connection counts
  const connections = await db.query.socialConnections.findMany({
    where: eq(socialConnections.importId, importId),
  });

  const matched = connections.filter((c) => c.goodreadsUserId !== null);
  const highConfidence = matched.filter(
    (c) => (c.matchConfidence || 0) >= 0.8
  );
  const mediumConfidence = matched.filter(
    (c) => (c.matchConfidence || 0) >= 0.4 && (c.matchConfidence || 0) < 0.8
  );
  const lowConfidence = matched.filter(
    (c) => (c.matchConfidence || 0) < 0.4 && c.goodreadsUserId
  );
  const unmatched = connections.filter((c) => c.goodreadsUserId === null);

  return NextResponse.json({
    id: importRecord.id,
    status: importRecord.status,
    source: importRecord.source,
    sourceHandle: importRecord.sourceHandle,
    totalAccounts: importRecord.totalAccounts,
    matchedAccounts: matched.length,
    createdAt: importRecord.createdAt,
    lastRefreshedAt: importRecord.lastRefreshedAt,
    breakdown: {
      highConfidence: highConfidence.length,
      mediumConfidence: mediumConfidence.length,
      lowConfidence: lowConfidence.length,
      unmatched: unmatched.length,
    },
  });
}
