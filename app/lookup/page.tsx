"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LookupSearch } from "@/components/lookup/LookupSearch";

export default function LookupPage() {
  const { status } = useSession();

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Look Up Anyone</h1>
      <p className="text-muted-foreground">
        Enter any X/Twitter handle or profile URL to see what they&apos;re
        reading on Goodreads.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <LookupSearch />
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>
          We&apos;ll search for this person&apos;s Goodreads profile using
          linked URLs, name matching, and username resolution. Results are
          cached for faster subsequent lookups.
        </p>
      </div>
    </div>
  );
}
