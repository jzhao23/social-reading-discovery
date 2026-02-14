import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const sourcePlatformEnum = pgEnum("source_platform", ["twitter"]);
export const importStatusEnum = pgEnum("import_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);
export const matchMethodEnum = pgEnum("match_method", [
  "linked_url",
  "email",
  "fuzzy_name",
  "username",
  "manual",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "currently_reading",
  "read",
  "rating",
  "review",
  "shelved",
  "recommendation",
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique(),
  name: text("name"),
  image: text("image"),
  twitterId: text("twitter_id").unique(),
  twitterHandle: text("twitter_handle"),
  goodreadsUserId: text("goodreads_user_id"),
  discoverable: boolean("discoverable").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Social graph imports
export const socialGraphImports = pgTable("social_graph_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  source: sourcePlatformEnum("source").notNull(),
  sourceAccountId: text("source_account_id").notNull(),
  sourceHandle: text("source_handle"),
  status: importStatusEnum("status").default("pending").notNull(),
  totalAccounts: integer("total_accounts").default(0),
  matchedAccounts: integer("matched_accounts").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastRefreshedAt: timestamp("last_refreshed_at"),
});

// Social connections
export const socialConnections = pgTable("social_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  importId: uuid("import_id")
    .references(() => socialGraphImports.id, { onDelete: "cascade" })
    .notNull(),
  sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
  sourceUserId: text("source_user_id").notNull(),
  sourceHandle: text("source_handle"),
  sourceDisplayName: text("source_display_name"),
  sourceBio: text("source_bio"),
  sourceProfileUrl: text("source_profile_url"),
  goodreadsUserId: text("goodreads_user_id"),
  matchConfidence: real("match_confidence").default(0),
  matchMethod: matchMethodEnum("match_method"),
  verifiedByUser: boolean("verified_by_user").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Resolution cache (global shared)
export const resolutionCache = pgTable(
  "resolution_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourcePlatform: sourcePlatformEnum("source_platform").notNull(),
    sourceUserId: text("source_user_id").notNull(),
    goodreadsUserId: text("goodreads_user_id").notNull(),
    confidence: real("confidence").notNull(),
    method: matchMethodEnum("method").notNull(),
    lastVerifiedAt: timestamp("last_verified_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSourceUser: uniqueIndex("unique_source_user").on(
      table.sourcePlatform,
      table.sourceUserId
    ),
  })
);

// Social feed items
export const socialFeedItems = pgTable("social_feed_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .references(() => socialConnections.id, { onDelete: "cascade" })
    .notNull(),
  goodreadsUserId: text("goodreads_user_id").notNull(),
  activityType: activityTypeEnum("activity_type").notNull(),
  bookId: text("book_id"),
  bookTitle: text("book_title"),
  bookAuthor: text("book_author"),
  bookCoverUrl: text("book_cover_url"),
  rating: integer("rating"),
  reviewSnippet: text("review_snippet"),
  activityDate: timestamp("activity_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  imports: many(socialGraphImports),
}));

export const socialGraphImportsRelations = relations(
  socialGraphImports,
  ({ one, many }) => ({
    user: one(users, {
      fields: [socialGraphImports.userId],
      references: [users.id],
    }),
    connections: many(socialConnections),
  })
);

export const socialConnectionsRelations = relations(
  socialConnections,
  ({ one, many }) => ({
    import: one(socialGraphImports, {
      fields: [socialConnections.importId],
      references: [socialGraphImports.id],
    }),
    feedItems: many(socialFeedItems),
  })
);

export const socialFeedItemsRelations = relations(
  socialFeedItems,
  ({ one }) => ({
    connection: one(socialConnections, {
      fields: [socialFeedItems.connectionId],
      references: [socialConnections.id],
    }),
  })
);
