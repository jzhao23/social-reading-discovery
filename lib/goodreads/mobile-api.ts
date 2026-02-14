import { redis } from "../redis";
import type {
  GoodreadsUser,
  GoodreadsBook,
  GoodreadsActivity,
  ShelfType,
} from "./types";

/**
 * Mobile API client for Goodreads.
 *
 * When GOODREADS_USE_MOBILE_API=true, this module is used instead of the
 * HTML scraper. The mobile API returns structured JSON and has higher
 * rate limits than web scraping.
 *
 * Endpoints here are based on documented patterns from the Goodreads
 * mobile app. They may change without notice.
 */

const MOBILE_API_BASE = "https://www.goodreads.com/api";
const CACHE_TTL = 24 * 60 * 60;

const MOBILE_HEADERS = {
  "User-Agent":
    "Goodreads/3.54.0 (iPhone; iOS 17.0; Scale/3.00)",
  Accept: "application/json",
  "Accept-Language": "en-US",
};

let lastRequestTime = 0;
const REQUEST_DELAY_MS = 500;

async function mobileApiFetch(path: string, cacheKey: string): Promise<unknown> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }

  const now = Date.now();
  if (now - lastRequestTime < REQUEST_DELAY_MS) {
    await new Promise((r) =>
      setTimeout(r, REQUEST_DELAY_MS - (now - lastRequestTime))
    );
  }
  lastRequestTime = Date.now();

  const response = await fetch(`${MOBILE_API_BASE}${path}`, {
    headers: MOBILE_HEADERS,
  });

  if (!response.ok) {
    throw new Error(
      `Goodreads Mobile API error: ${response.status} for ${path}`
    );
  }

  const data = await response.json();

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  } catch {
    // Redis unavailable
  }

  return data;
}

export async function fetchUserProfile(
  goodreadsUserId: string
): Promise<GoodreadsUser | null> {
  try {
    const data = (await mobileApiFetch(
      `/user/show/${goodreadsUserId}.json`,
      `gr:mobile:profile:${goodreadsUserId}`
    )) as Record<string, unknown>;

    const user = (data as { user?: Record<string, unknown> }).user || data;

    return {
      id: goodreadsUserId,
      name: (user.name as string) || "",
      profileUrl: `https://www.goodreads.com/user/show/${goodreadsUserId}`,
      imageUrl: (user.image_url as string) || undefined,
      bookCount: (user.books_count as number) || undefined,
      reviewCount: (user.reviews_count as number) || undefined,
      location: (user.location as string) || undefined,
    };
  } catch (error) {
    console.error(`Mobile API: Failed to fetch profile ${goodreadsUserId}:`, error);
    return null;
  }
}

export async function fetchUserShelves(
  goodreadsUserId: string,
  shelf: ShelfType
): Promise<GoodreadsBook[]> {
  try {
    const data = (await mobileApiFetch(
      `/review/list/${goodreadsUserId}.json?shelf=${shelf}&per_page=50&sort=date_added&order=d`,
      `gr:mobile:shelf:${goodreadsUserId}:${shelf}`
    )) as { reviews?: Array<Record<string, unknown>> };

    const reviews = data.reviews || [];

    return reviews.map((review) => {
      const book = (review.book || {}) as Record<string, unknown>;
      return {
        id: String(book.id || ""),
        title: (book.title as string) || "",
        author: ((book.author as Record<string, unknown>)?.name as string) || "",
        coverUrl: (book.image_url as string) || undefined,
        userRating: (review.rating as number) || undefined,
        dateAdded: (review.date_added as string) || undefined,
        dateRead: (review.read_at as string) || undefined,
      };
    });
  } catch (error) {
    console.error(`Mobile API: Failed to fetch shelf for ${goodreadsUserId}:`, error);
    return [];
  }
}

export async function fetchRecentUpdates(
  goodreadsUserId: string
): Promise<GoodreadsActivity[]> {
  try {
    const data = (await mobileApiFetch(
      `/updates/friends.json?user_id=${goodreadsUserId}`,
      `gr:mobile:updates:${goodreadsUserId}`
    )) as { updates?: Array<Record<string, unknown>> };

    const updates = data.updates || [];

    return updates.map((update) => {
      const book = (update.book || {}) as Record<string, unknown>;
      const actionText = (update.action_text as string) || "";

      let type: GoodreadsActivity["type"] = "read";
      if (actionText.includes("currently reading")) type = "currently_reading";
      else if (actionText.includes("rated")) type = "rating";
      else if (actionText.includes("reviewed")) type = "review";
      else if (actionText.includes("added") || actionText.includes("shelved"))
        type = "shelved";

      return {
        type,
        book: {
          id: String(book.id || ""),
          title: (book.title as string) || "",
          author:
            ((book.author as Record<string, unknown>)?.name as string) || "",
          coverUrl: (book.image_url as string) || undefined,
        },
        date:
          (update.updated_at as string) || new Date().toISOString(),
        rating: (update.rating as number) || undefined,
        reviewSnippet: (update.body as string)?.slice(0, 300) || undefined,
      };
    });
  } catch (error) {
    console.error(`Mobile API: Failed to fetch updates for ${goodreadsUserId}:`, error);
    return [];
  }
}

export async function searchUsers(
  query: string
): Promise<GoodreadsUser[]> {
  try {
    const data = (await mobileApiFetch(
      `/search/index.json?q=${encodeURIComponent(query)}&search_type=people`,
      `gr:mobile:search:${query}`
    )) as { results?: Array<Record<string, unknown>> };

    const results = data.results || [];

    return results.map((result) => ({
      id: String(result.id || ""),
      name: (result.name as string) || "",
      profileUrl: `https://www.goodreads.com/user/show/${result.id}`,
      imageUrl: (result.image_url as string) || undefined,
    }));
  } catch (error) {
    console.error(`Mobile API: Failed to search users for "${query}":`, error);
    return [];
  }
}
