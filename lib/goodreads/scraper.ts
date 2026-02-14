import * as cheerio from "cheerio";
import { redis } from "../redis";
import type {
  GoodreadsUser,
  GoodreadsBook,
  GoodreadsActivity,
  ShelfType,
} from "./types";

const GOODREADS_BASE = "https://www.goodreads.com";
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
const REQUEST_DELAY_MS = 1000; // 1 request per second

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<string> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Goodreads fetch failed: ${response.status} ${response.statusText} for ${url}`
    );
  }

  return response.text();
}

async function cachedFetch(url: string, cacheKey: string): Promise<string> {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
  } catch {
    // Redis unavailable, proceed without cache
  }

  const html = await rateLimitedFetch(url);

  try {
    await redis.setex(cacheKey, CACHE_TTL, html);
  } catch {
    // Redis unavailable, proceed without caching
  }

  return html;
}

export async function fetchUserProfile(
  goodreadsUserId: string
): Promise<GoodreadsUser | null> {
  try {
    const url = `${GOODREADS_BASE}/user/show/${goodreadsUserId}`;
    const html = await cachedFetch(url, `gr:profile:${goodreadsUserId}`);
    const $ = cheerio.load(html);

    const name =
      $("h1.userProfileName").text().trim() ||
      $(".userInfoBoxContent .nameText").text().trim() ||
      $("title").text().replace(" | Goodreads", "").trim();

    if (!name) return null;

    const imageUrl =
      $(".userProfileImage img").attr("src") ||
      $(".leftAlignedProfilePicture img").attr("src");

    const statsText = $(".profilePageUserStatsInfo").text();
    const bookCountMatch = statsText.match(/([\d,]+)\s*books?/i);
    const reviewCountMatch = statsText.match(/([\d,]+)\s*reviews?/i);

    const memberSince = $(".memberSinceText").text().trim();
    const location = $(".profileInfoLine .profileInfoValue")
      .first()
      .text()
      .trim();

    return {
      id: goodreadsUserId,
      name,
      profileUrl: url,
      imageUrl: imageUrl || undefined,
      bookCount: bookCountMatch
        ? parseInt(bookCountMatch[1].replace(/,/g, ""))
        : undefined,
      reviewCount: reviewCountMatch
        ? parseInt(reviewCountMatch[1].replace(/,/g, ""))
        : undefined,
      memberSince: memberSince || undefined,
      location: location || undefined,
    };
  } catch (error) {
    console.error(
      `Failed to fetch Goodreads profile ${goodreadsUserId}:`,
      error
    );
    return null;
  }
}

export async function fetchUserShelves(
  goodreadsUserId: string,
  shelf: ShelfType
): Promise<GoodreadsBook[]> {
  try {
    const url = `${GOODREADS_BASE}/review/list/${goodreadsUserId}?shelf=${shelf}&per_page=50&sort=date_added&order=d`;
    const html = await cachedFetch(
      url,
      `gr:shelf:${goodreadsUserId}:${shelf}`
    );
    const $ = cheerio.load(html);
    const books: GoodreadsBook[] = [];

    $("tr.bookalike, tr.review").each((_, el) => {
      const $row = $(el);

      const titleEl = $row.find("td.title a, td.field.title a").first();
      const title = titleEl.text().trim();
      const bookUrl = titleEl.attr("href") || "";
      const bookIdMatch = bookUrl.match(/\/show\/(\d+)/);

      const author = $row
        .find("td.author a, td.field.author a")
        .first()
        .text()
        .trim();

      const coverUrl =
        $row.find("td.cover img, td.field.cover img").attr("src") ||
        undefined;

      const ratingEl = $row.find(".staticStars, .staticStar");
      const ratingText = ratingEl.attr("title") || "";
      const ratingMap: Record<string, number> = {
        "it was amazing": 5,
        "really liked it": 4,
        "liked it": 3,
        "it was ok": 2,
        "did not like it": 1,
      };
      const userRating = ratingMap[ratingText.toLowerCase()] || undefined;

      const dateAdded = $row
        .find("td.date_added span, td.field.date_added span")
        .attr("title");

      const dateRead = $row
        .find("td.date_read span, td.field.date_read span")
        .attr("title");

      if (title && bookIdMatch) {
        books.push({
          id: bookIdMatch[1],
          title,
          author,
          coverUrl: coverUrl?.replace(/\._\w+_\./, ".") || coverUrl,
          userRating,
          dateAdded: dateAdded || undefined,
          dateRead: dateRead || undefined,
        });
      }
    });

    return books;
  } catch (error) {
    console.error(
      `Failed to fetch shelf ${shelf} for user ${goodreadsUserId}:`,
      error
    );
    return [];
  }
}

export async function fetchRecentUpdates(
  goodreadsUserId: string
): Promise<GoodreadsActivity[]> {
  try {
    const url = `${GOODREADS_BASE}/user/updates_rss/${goodreadsUserId}`;
    const xml = await cachedFetch(
      url,
      `gr:updates:${goodreadsUserId}`
    );
    const $ = cheerio.load(xml, { xmlMode: true });
    const activities: GoodreadsActivity[] = [];

    $("item").each((_, el) => {
      const $item = $(el);
      const title = $item.find("title").text();
      const description = $item.find("description").text();
      const pubDate = $item.find("pubDate").text();
      const $desc = cheerio.load(description);
      const bookTitle =
        $desc("a").first().text().trim() || title.split(" — ")[0]?.trim();
      const bookLink = $desc("a").first().attr("href") || "";
      const bookIdMatch = bookLink.match(/\/show\/(\d+)/);
      const coverUrl = $desc("img").attr("src");

      let type: GoodreadsActivity["type"] = "read";
      let rating: number | undefined;

      if (title.includes("is currently reading")) {
        type = "currently_reading";
      } else if (title.includes("finished reading") || title.includes("read")) {
        type = "read";
      } else if (title.includes("rated")) {
        type = "rating";
        const ratingMatch = title.match(/rated it (\d) of 5 stars/);
        if (ratingMatch) rating = parseInt(ratingMatch[1]);
      } else if (title.includes("reviewed")) {
        type = "review";
      } else if (title.includes("added") || title.includes("shelved")) {
        type = "shelved";
      }

      if (bookTitle && bookIdMatch) {
        activities.push({
          type,
          book: {
            id: bookIdMatch[1],
            title: bookTitle,
            author: "",
            coverUrl: coverUrl || undefined,
          },
          date: pubDate || new Date().toISOString(),
          rating,
          reviewSnippet:
            type === "review"
              ? $desc("p").text().slice(0, 300) || undefined
              : undefined,
        });
      }
    });

    return activities;
  } catch (error) {
    console.error(
      `Failed to fetch updates for user ${goodreadsUserId}:`,
      error
    );
    return [];
  }
}

export async function searchUsers(
  query: string
): Promise<GoodreadsUser[]> {
  try {
    const url = `${GOODREADS_BASE}/search?q=${encodeURIComponent(query)}&search_type=people`;
    const html = await cachedFetch(url, `gr:search:${query}`);
    const $ = cheerio.load(html);
    const users: GoodreadsUser[] = [];

    $(".peopleListItem, .tableList tr").each((_, el) => {
      const $item = $(el);
      const linkEl = $item.find("a[href*='/user/show/']").first();
      const href = linkEl.attr("href") || "";
      const idMatch = href.match(/\/user\/show\/(\d+)/);

      const name =
        linkEl.text().trim() || $item.find(".authorName").text().trim();
      const imageUrl = $item.find("img").attr("src");

      if (name && idMatch) {
        users.push({
          id: idMatch[1],
          name,
          profileUrl: `${GOODREADS_BASE}/user/show/${idMatch[1]}`,
          imageUrl: imageUrl || undefined,
        });
      }
    });

    return users;
  } catch (error) {
    console.error(`Failed to search Goodreads users for "${query}":`, error);
    return [];
  }
}

export async function checkProfileExists(
  username: string
): Promise<{ exists: boolean; userId?: string }> {
  try {
    const url = `${GOODREADS_BASE}/${username}`;
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return { exists: false };
    }

    const finalUrl = response.url;
    const idMatch = finalUrl.match(/\/user\/show\/(\d+)/);

    if (idMatch) {
      return { exists: true, userId: idMatch[1] };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
}
