"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ImportData {
  id: string;
  status: string;
  source: string;
  sourceHandle: string | null;
  totalAccounts: number;
  matchedAccounts: number;
  createdAt: string;
  lastRefreshedAt: string | null;
  breakdown: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    unmatched: number;
  };
}

interface ImportStatusProps {
  importId: string;
  onComplete?: () => void;
}

export function ImportStatus({ importId, onComplete }: ImportStatusProps) {
  const [data, setData] = useState<ImportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/import/${importId}/status`);
        if (!res.ok) throw new Error("Failed to fetch status");
        const importData: ImportData = await res.json();
        setData(importData);

        if (
          importData.status === "complete" ||
          importData.status === "failed"
        ) {
          stopped = true;
          if (importData.status === "complete") {
            onComplete?.();
          }
        }
      } catch {
        setError("Failed to load import status");
      }
    };

    fetchStatus();
    const interval = setInterval(() => {
      if (!stopped) fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [importId, onComplete]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress =
    data.totalAccounts > 0
      ? Math.round((data.matchedAccounts / data.totalAccounts) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Import{data.sourceHandle ? ` @${data.sourceHandle}` : ""}
          </CardTitle>
          <Badge
            variant={
              data.status === "complete"
                ? "default"
                : data.status === "failed"
                  ? "destructive"
                  : "secondary"
            }
          >
            {data.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {data.status === "processing" && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">
                Scanning {data.totalAccounts} accounts...{" "}
                {data.matchedAccounts} matches found
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
          </div>
        )}

        {data.status === "complete" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {data.totalAccounts}
                </p>
                <p className="text-xs text-muted-foreground">Total scanned</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {data.matchedAccounts}
                </p>
                <p className="text-xs text-muted-foreground">Matched</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{progress}%</p>
                <p className="text-xs text-muted-foreground">Match rate</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-accent">
                  {data.breakdown.highConfidence}
                </p>
                <p className="text-xs text-muted-foreground">High confidence</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-muted-foreground">
                {data.breakdown.mediumConfidence} medium confidence
              </span>
              <span className="text-muted-foreground">
                {data.breakdown.lowConfidence} low confidence
              </span>
              <span className="text-muted-foreground">
                {data.breakdown.unmatched} unmatched
              </span>
            </div>
          </div>
        )}

        {data.status === "failed" && (
          <p className="text-sm text-destructive">
            This import failed. Please try again.
          </p>
        )}

        {data.status === "pending" && (
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              Queued for processing...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
