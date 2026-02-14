import type {
  TwitterUser,
  TwitterFollowingResponse,
  BookSignals,
} from "./types";

const TWITTER_API_BASE = "https://api.twitter.com/2";
const MAX_RESULTS_PER_PAGE = 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 15;

class RateLimiter {
  private requests: number[] = [];

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    );

    if (this.requests.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestInWindow = this.requests[0];
      const waitTime = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow) + 1000;
      console.log(
        `Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.requests.push(Date.now());
  }
}

const rateLimiter = new RateLimiter();

export async function fetchFollowing(
  userId: string,
  accessToken: string
): Promise<TwitterUser[]> {
  const allUsers: TwitterUser[] = [];
  let paginationToken: string | undefined;

  do {
    await rateLimiter.waitIfNeeded();

    const params = new URLSearchParams({
      max_results: MAX_RESULTS_PER_PAGE.toString(),
      "user.fields":
        "description,profile_image_url,url,public_metrics,entities",
    });

    if (paginationToken) {
      params.set("pagination_token", paginationToken);
    }

    const response = await fetch(
      `${TWITTER_API_BASE}/users/${userId}/following?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 429) {
      const resetAfter = response.headers.get("x-rate-limit-reset");
      const waitMs = resetAfter
        ? (parseInt(resetAfter) * 1000 - Date.now() + 1000)
        : 60000;
      console.log(`429 rate limited, waiting ${Math.round(waitMs / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Twitter API error: ${response.status} ${response.statusText}`
      );
    }

    const data: TwitterFollowingResponse = await response.json();

    if (data.data) {
      allUsers.push(...data.data);
    }

    paginationToken = data.meta?.next_token;
  } while (paginationToken);

  return allUsers;
}

export async function fetchProfile(
  username: string,
  accessToken?: string
): Promise<TwitterUser | null> {
  const bearerToken =
    accessToken || process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("No Twitter bearer token available");
  }

  const params = new URLSearchParams({
    "user.fields":
      "description,profile_image_url,url,public_metrics,entities",
  });

  const response = await fetch(
    `${TWITTER_API_BASE}/users/by/username/${username}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Twitter API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.data || null;
}

const BOOK_KEYWORDS = [
  "reader",
  "reading",
  "bookworm",
  "bibliophile",
  "books",
  "author",
  "writer",
  "novelist",
  "booklover",
  "bookish",
  "tbr",
  "goodreads",
  "bookstagram",
  "booktok",
  "booktwitter",
  "amreading",
  "currentlyreading",
  "bookclub",
  "literary",
  "fiction",
  "nonfiction",
  "memoir",
];

export function parseProfileForBookSignals(
  profile: TwitterUser
): BookSignals {
  const bio = (profile.description || "").toLowerCase();
  const allUrls: string[] = [];

  // Extract URLs from entities
  if (profile.entities?.url?.urls) {
    allUrls.push(
      ...profile.entities.url.urls.map((u) => u.expanded_url)
    );
  }
  if (profile.entities?.description?.urls) {
    allUrls.push(
      ...profile.entities.description.urls.map((u) => u.expanded_url)
    );
  }

  // Check for Goodreads links
  const goodreadsUrl = allUrls.find(
    (url) =>
      url.includes("goodreads.com/user/") ||
      url.includes("goodreads.com/author/") ||
      url.includes("goodreads.com/review/")
  );

  // Check for book keywords in bio
  const foundKeywords = BOOK_KEYWORDS.filter(
    (keyword) =>
      bio.includes(keyword) ||
      bio.includes(`#${keyword}`)
  );

  return {
    hasGoodreadsLink: !!goodreadsUrl,
    goodreadsUrl,
    isBookish: foundKeywords.length >= 1 || !!goodreadsUrl,
    bookKeywords: foundKeywords,
  };
}
