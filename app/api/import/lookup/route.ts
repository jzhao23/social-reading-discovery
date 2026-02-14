import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { socialGraphImports } from "@/lib/db/schema";
import { fetchProfile } from "@/lib/twitter/client";
import { queueImportJob } from "@/lib/jobs/queue";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { profileUrl } = body as { profileUrl?: string };

  if (!profileUrl) {
    return NextResponse.json(
      { error: "profileUrl is required" },
      { status: 400 }
    );
  }

  // Extract username from URL or handle
  let username = profileUrl.trim();

  // Handle various URL formats
  const urlMatch = username.match(
    /(?:twitter\.com|x\.com)\/(@?[\w]+)/i
  );
  if (urlMatch) {
    username = urlMatch[1].replace(/^@/, "");
  } else {
    // Assume it's a bare handle
    username = username.replace(/^@/, "");
  }

  if (!username || username.length === 0) {
    return NextResponse.json(
      { error: "Invalid profile URL or handle" },
      { status: 400 }
    );
  }

  try {
    // Fetch the profile to get the user ID
    const profile = await fetchProfile(username, session.accessToken);

    if (!profile) {
      return NextResponse.json(
        { error: "Twitter profile not found" },
        { status: 404 }
      );
    }

    // Create import record for this lookup
    const [importRecord] = await db
      .insert(socialGraphImports)
      .values({
        userId: session.userId,
        source: "twitter",
        sourceAccountId: profile.id,
        sourceHandle: profile.username,
        status: "pending",
      })
      .returning();

    // Queue import job
    await queueImportJob({
      importId: importRecord.id,
      userId: session.userId,
      sourceAccountId: profile.id,
      sourceHandle: profile.username,
      accessToken: session.accessToken || "",
    });

    return NextResponse.json({
      importId: importRecord.id,
      profile: {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        profileImageUrl: profile.profile_image_url,
      },
      status: "pending",
    });
  } catch (error) {
    console.error("Lookup import failed:", error);
    return NextResponse.json(
      { error: "Failed to look up profile" },
      { status: 500 }
    );
  }
}
