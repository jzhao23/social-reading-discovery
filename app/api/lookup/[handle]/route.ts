import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchProfile, parseProfileForBookSignals } from "@/lib/twitter/client";
import { resolve } from "@/lib/resolution/pipeline";
import {
  fetchUserProfile,
  fetchUserShelves,
} from "@/lib/goodreads/index";

export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const handle = params.handle.replace(/^@/, "");

  try {
    // Fetch Twitter profile
    const twitterProfile = await fetchProfile(handle, session.accessToken);

    if (!twitterProfile) {
      return NextResponse.json(
        { error: "Twitter profile not found" },
        { status: 404 }
      );
    }

    const bookSignals = parseProfileForBookSignals(twitterProfile);

    // Run resolution pipeline
    const resolution = await resolve(twitterProfile);

    if (!resolution) {
      return NextResponse.json({
        twitter: {
          id: twitterProfile.id,
          username: twitterProfile.username,
          name: twitterProfile.name,
          description: twitterProfile.description,
          profileImageUrl: twitterProfile.profile_image_url,
        },
        bookSignals,
        goodreads: null,
        message: "No Goodreads profile found for this user",
      });
    }

    // Fetch Goodreads profile and reading data
    const grProfile = await fetchUserProfile(resolution.goodreadsUserId);
    const currentlyReading = await fetchUserShelves(
      resolution.goodreadsUserId,
      "currently-reading"
    );
    const recentReads = await fetchUserShelves(
      resolution.goodreadsUserId,
      "read"
    );

    return NextResponse.json({
      twitter: {
        id: twitterProfile.id,
        username: twitterProfile.username,
        name: twitterProfile.name,
        description: twitterProfile.description,
        profileImageUrl: twitterProfile.profile_image_url,
      },
      bookSignals,
      goodreads: {
        profile: grProfile,
        matchConfidence: resolution.confidence,
        matchMethod: resolution.method,
        currentlyReading: currentlyReading.slice(0, 5),
        recentReads: recentReads.slice(0, 10),
      },
    });
  } catch (error) {
    console.error(`Lookup failed for @${handle}:`, error);
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 }
    );
  }
}
