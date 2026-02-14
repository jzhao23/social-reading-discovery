"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LookupSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = () => {
    if (!query.trim()) return;

    setLoading(true);

    // Extract handle from URL if needed
    let handle = query.trim();
    const urlMatch = handle.match(
      /(?:twitter\.com|x\.com)\/@?([\w]+)/i
    );
    if (urlMatch) {
      handle = urlMatch[1];
    }
    handle = handle.replace(/^@/, "");

    router.push(`/lookup/${handle}`);
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Enter X handle or profile URL (e.g. @elonmusk or x.com/elonmusk)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        className="flex-1"
      />
      <Button
        onClick={handleSearch}
        disabled={loading || !query.trim()}
        className="flex-shrink-0"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Looking up...
          </span>
        ) : (
          "Look up"
        )}
      </Button>
    </div>
  );
}
