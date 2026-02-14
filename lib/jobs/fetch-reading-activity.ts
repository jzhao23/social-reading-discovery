import { db } from "../db";
import { socialFeedItems } from "../db/schema";
import { fetchUserShelves, fetchRecentUpdates } from "../goodreads/index";
import type { ActivityJobData } from "./queue";

/**
 * Fetch reading activity for a resolved Goodreads user and populate
 * the social_feed_items table.
 */
export async function processActivityJob(
  data: ActivityJobData
): Promise<void> {
  const { connectionId, goodreadsUserId } = data;

  try {
    // Fetch currently reading
    const currentlyReading = await fetchUserShelves(
      goodreadsUserId,
      "currently-reading"
    );

    for (const book of currentlyReading) {
      await db
        .insert(socialFeedItems)
        .values({
          connectionId,
          goodreadsUserId,
          activityType: "currently_reading",
          bookId: book.id,
          bookTitle: book.title,
          bookAuthor: book.author,
          bookCoverUrl: book.coverUrl || null,
          activityDate: book.dateAdded
            ? new Date(book.dateAdded)
            : new Date(),
        })
        .onConflictDoNothing();
    }

    // Fetch recently read books (with ratings)
    const readBooks = await fetchUserShelves(goodreadsUserId, "read");

    // Only take the 20 most recent to avoid flooding the feed
    const recentReads = readBooks.slice(0, 20);

    for (const book of recentReads) {
      const hasRating = book.userRating && book.userRating > 0;

      await db
        .insert(socialFeedItems)
        .values({
          connectionId,
          goodreadsUserId,
          activityType: hasRating ? "rating" : "read",
          bookId: book.id,
          bookTitle: book.title,
          bookAuthor: book.author,
          bookCoverUrl: book.coverUrl || null,
          rating: book.userRating || null,
          activityDate: book.dateRead
            ? new Date(book.dateRead)
            : book.dateAdded
              ? new Date(book.dateAdded)
              : new Date(),
        })
        .onConflictDoNothing();
    }

    // Fetch recent updates (reviews, etc.)
    const updates = await fetchRecentUpdates(goodreadsUserId);

    for (const update of updates) {
      if (update.type === "review") {
        await db
          .insert(socialFeedItems)
          .values({
            connectionId,
            goodreadsUserId,
            activityType: "review",
            bookId: update.book.id,
            bookTitle: update.book.title,
            bookAuthor: update.book.author,
            bookCoverUrl: update.book.coverUrl || null,
            rating: update.rating || null,
            reviewSnippet: update.reviewSnippet || null,
            activityDate: new Date(update.date),
          })
          .onConflictDoNothing();
      }
    }
  } catch (error) {
    console.error(
      `Activity fetch failed for connection ${connectionId}:`,
      error
    );
    throw error;
  }
}
