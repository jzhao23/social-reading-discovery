"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface FeedItem {
  id: string;
  activityType: string;
  book: {
    id: string | null;
    title: string | null;
    author: string | null;
    coverUrl: string | null;
  };
  rating: number | null;
  reviewSnippet: string | null;
  activityDate: string;
  person: {
    connectionId: string;
    handle: string | null;
    displayName: string | null;
    profileUrl: string | null;
    goodreadsUserId: string | null;
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${
            star <= rating ? "text-accent" : "text-muted-foreground/30"
          }`}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}

function activityLabel(type: string): string {
  switch (type) {
    case "currently_reading":
      return "is reading";
    case "read":
      return "finished";
    case "rating":
      return "rated";
    case "review":
      return "reviewed";
    case "shelved":
      return "shelved";
    case "recommendation":
      return "recommends";
    default:
      return "";
  }
}

function activityBadgeVariant(
  type: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "currently_reading":
      return "default";
    case "rating":
      return "secondary";
    case "review":
      return "outline";
    default:
      return "secondary";
  }
}

export function FeedCard({ item }: { item: FeedItem }) {
  const timeAgo = formatDistanceToNow(new Date(item.activityDate), {
    addSuffix: true,
  });

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex gap-4 p-4">
        {/* Book Cover */}
        <div className="relative h-32 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          {item.book.coverUrl ? (
            <Image
              src={item.book.coverUrl}
              alt={item.book.title || "Book cover"}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No cover
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            {/* Person + Activity */}
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-sm">
              <a
                href={item.person.profileUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-primary"
              >
                {item.person.displayName || `@${item.person.handle}`}
              </a>
              <span className="text-muted-foreground">
                {activityLabel(item.activityType)}
              </span>
            </div>

            {/* Book Title */}
            <h3 className="text-base font-semibold leading-tight">
              {item.book.title || "Unknown Book"}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {item.book.author || "Unknown Author"}
            </p>

            {/* Rating */}
            {item.rating && item.rating > 0 && (
              <div className="mt-2">
                <StarRating rating={item.rating} />
              </div>
            )}

            {/* Review snippet */}
            {item.reviewSnippet && (
              <p className="mt-2 line-clamp-2 text-sm italic text-muted-foreground">
                &ldquo;{item.reviewSnippet}&rdquo;
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between">
            <Badge variant={activityBadgeVariant(item.activityType)}>
              {item.activityType.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
