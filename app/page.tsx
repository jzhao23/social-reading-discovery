"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface Stats {
  totalImports: number;
  totalAccounts: number;
  totalMatched: number;
  matchRate: number;
  totalFeedItems: number;
  uniqueBooks: number;
}

function LandingHero() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Discover what your{" "}
          <span className="text-primary">Twitter circle</span> is reading
        </h1>
        <p className="text-lg text-muted-foreground">
          Import your X/Twitter social graph, find your friends on Goodreads,
          and see a curated feed of what the people you trust are reading,
          rating, and recommending.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            onClick={() => signIn("twitter")}
            className="w-full sm:w-auto"
          >
            Connect with X / Twitter
          </Button>
          <p className="text-xs text-muted-foreground">
            Read-only access. We never post on your behalf.
          </p>
        </div>

        <div className="grid gap-6 pt-8 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">1</div>
            <h3 className="font-semibold">Import Your Network</h3>
            <p className="text-sm text-muted-foreground">
              Connect your X account or paste any profile URL to scan their
              following list.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">2</div>
            <h3 className="font-semibold">Find Readers</h3>
            <p className="text-sm text-muted-foreground">
              Our resolution engine matches X accounts to Goodreads profiles
              using smart, layered detection.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">3</div>
            <h3 className="font-semibold">See What They Read</h3>
            <p className="text-sm text-muted-foreground">
              Browse a curated feed of books, ratings, and reviews from people
              you actually know and trust.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (stats.totalImports === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-8 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to Social Reading</h1>
          <p className="mt-2 text-muted-foreground">
            Let&apos;s find your friends on Goodreads.
          </p>
        </div>

        <div className="grid gap-4">
          <Link href="/import">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">Import My Network</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scan your X following list and find who&apos;s on Goodreads.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/lookup">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">Look Up Someone</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paste any X profile URL to see what they&apos;re reading.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-primary">
              {stats.totalMatched}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connections found
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-primary">
              {stats.matchRate}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Match rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-primary">
              {stats.uniqueBooks}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Books discovered
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href="/feed">
          <Button>View Reading Feed</Button>
        </Link>
        <Link href="/import">
          <Button variant="outline">Manage Imports</Button>
        </Link>
        <Link href="/lookup">
          <Button variant="outline">Look Up Someone</Button>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <LandingHero />;
  }

  return <Dashboard />;
}
