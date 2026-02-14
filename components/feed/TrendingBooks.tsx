"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendingBook {
  book: {
    id: string | null;
    title: string | null;
    author: string | null;
    coverUrl: string | null;
  };
  interactionCount: number;
  avgRating: number | null;
}

export function TrendingBooks() {
  const [trending, setTrending] = useState<TrendingBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed/trending")
      .then((r) => r.json())
      .then((data) => {
        setTrending(data.trending || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trending in Your Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 w-20 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trending.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trending in Your Network</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {trending.map((item) => (
            <div
              key={item.book.id}
              className="flex w-24 flex-shrink-0 flex-col items-center gap-1.5"
            >
              <div className="relative h-32 w-20 overflow-hidden rounded-md bg-muted shadow-sm">
                {item.book.coverUrl ? (
                  <Image
                    src={item.book.coverUrl}
                    alt={item.book.title || "Book"}
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                    No cover
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-center text-xs font-medium leading-tight">
                {item.book.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {item.interactionCount} people
                {item.avgRating
                  ? ` / ${item.avgRating} avg`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
