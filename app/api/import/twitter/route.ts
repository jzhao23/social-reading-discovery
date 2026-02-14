import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { socialGraphImports } from "@/lib/db/schema";
import { queueImportJob } from "@/lib/jobs/queue";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.userId || !session?.twitterId || !session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Create import record
    const [importRecord] = await db
      .insert(socialGraphImports)
      .values({
        userId: session.userId,
        source: "twitter",
        sourceAccountId: session.twitterId,
        sourceHandle: null,
        status: "pending",
      })
      .returning();

    // Queue background import job
    await queueImportJob({
      importId: importRecord.id,
      userId: session.userId,
      sourceAccountId: session.twitterId,
      accessToken: session.accessToken,
    });

    return NextResponse.json({
      importId: importRecord.id,
      status: "pending",
      message: "Import started. Check status for progress.",
    });
  } catch (error) {
    console.error("Failed to start import:", error);
    return NextResponse.json(
      { error: "Failed to start import" },
      { status: 500 }
    );
  }
}
