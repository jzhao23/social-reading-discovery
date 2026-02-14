"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { FeedCard } from "@/components/feed/FeedCard";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { TrendingBooks } from "@/components/feed/TrendingBooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function FeedPage() {
  const { status } = useSession();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [timeRange, setTimeRange] = useState("all");
  const [activityType, setActivityType] = useState("all");

  const fetchFeed = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "20",
        });
        if (timeRange !== "all") params.set("timeRange", timeRange);
        if (activityType !== "all") params.set("activityType", activityType);

        const res = await fetch(`/api/feed?${params}`);
        const data = await res.json();

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Failed to fetch feed:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [timeRange, activityType]
  );

  useEffect(() => {
    if (status === "authenticated") {
      setPage(1);
      fetchFeed(1);
    }
  }, [status, timeRange, activityType, fetchFeed]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/");
  }

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reading Feed</h1>
      </div>

      <TrendingBooks />

      <FeedFilters
        timeRange={timeRange}
        activityType={activityType}
        onTimeRangeChange={setTimeRange}
        onActivityTypeChange={setActivityType}
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 rounded-lg border p-4">
              <Skeleton className="h-32 w-20 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <p className="text-lg font-medium">No reading activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import your Twitter network to start seeing what they&apos;re
            reading.
          </p>
          <Button className="mt-4" asChild>
            <a href="/import">Import Network</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Loading...
                  </span>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
