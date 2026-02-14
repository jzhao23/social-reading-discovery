"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImportStatus } from "@/components/import/ImportStatus";
import { MatchCard } from "@/components/import/MatchCard";
import { ManualLinkModal } from "@/components/import/ManualLinkModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Connection {
  id: string;
  sourceHandle: string | null;
  sourceDisplayName: string | null;
  sourceProfileUrl: string | null;
  goodreadsUserId: string | null;
  matchConfidence: number;
  matchMethod: string | null;
  verifiedByUser: boolean;
}

export default function ImportPage() {
  const { status } = useSession();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lookupUrl, setLookupUrl] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [manualLinkTarget, setManualLinkTarget] = useState<{
    id: string;
    handle: string | null;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      await fetch("/api/stats");
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, fetchData]);

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

  const handleImportNetwork = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/import/twitter", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Import failed",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      setActiveImportId(data.importId);
      toast({ title: "Import started", description: "Scanning your network..." });
    } catch {
      toast({
        title: "Import failed",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupUrl.trim()) return;
    setLookingUp(true);

    try {
      const res = await fetch("/api/import/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: lookupUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Lookup failed",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
        return;
      }

      setActiveImportId(data.importId);
      setLookupUrl("");
      toast({ title: "Import started", description: `Scanning @${data.profile?.username}...` });
    } catch {
      toast({
        title: "Lookup failed",
        description: "Network error",
        variant: "destructive",
      });
    } finally {
      setLookingUp(false);
    }
  };

  const handleConfirm = async (connectionId: string) => {
    try {
      await fetch(`/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      toast({ title: "Match confirmed" });
      // Refresh connections
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId ? { ...c, verifiedByUser: true } : c
        )
      );
    } catch {
      toast({ title: "Failed to confirm", variant: "destructive" });
    }
  };

  const handleReject = async (connectionId: string) => {
    try {
      await fetch(`/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      toast({ title: "Match rejected" });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId
            ? { ...c, goodreadsUserId: null, matchConfidence: 0 }
            : c
        )
      );
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  };

  const handleManualLink = async (
    connectionId: string,
    goodreadsUserId: string
  ) => {
    try {
      await fetch(`/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual_link", goodreadsUserId }),
      });
      toast({ title: "Account linked" });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId
            ? {
                ...c,
                goodreadsUserId,
                matchConfidence: 1.0,
                matchMethod: "manual",
                verifiedByUser: true,
              }
            : c
        )
      );
    } catch {
      toast({ title: "Failed to link", variant: "destructive" });
    }
  };

  const matchedConnections = connections.filter((c) => c.goodreadsUserId);
  const unmatchedConnections = connections.filter((c) => !c.goodreadsUserId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Social Graph</h1>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">New Import</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          {/* Import options */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import My Network</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Scan your X/Twitter following list and find who&apos;s on
                  Goodreads.
                </p>
                <Button
                  onClick={handleImportNetwork}
                  disabled={importing}
                  className="w-full"
                >
                  {importing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Starting...
                    </span>
                  ) : (
                    "Import My Following"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Look Up a Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Paste any X profile URL to scan their following list.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="x.com/username"
                    value={lookupUrl}
                    onChange={(e) => setLookupUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  />
                  <Button
                    onClick={handleLookup}
                    disabled={lookingUp || !lookupUrl.trim()}
                    variant="outline"
                  >
                    {lookingUp ? "..." : "Go"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active import status */}
          {activeImportId && (
            <ImportStatus
              importId={activeImportId}
              onComplete={() => {
                toast({
                  title: "Import complete",
                  description: "Check the Matches tab to review results.",
                });
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium">No matches yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start an import to see matched accounts here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {matchedConnections.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-semibold">
                    Matched ({matchedConnections.length})
                  </h2>
                  <div className="space-y-2">
                    {matchedConnections.map((conn) => (
                      <MatchCard
                        key={conn.id}
                        connection={conn}
                        onConfirm={handleConfirm}
                        onReject={handleReject}
                        onManualLink={(id) =>
                          setManualLinkTarget({
                            id,
                            handle: conn.sourceHandle,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {unmatchedConnections.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-semibold">
                    Unmatched ({unmatchedConnections.length})
                  </h2>
                  <div className="space-y-2">
                    {unmatchedConnections.map((conn) => (
                      <MatchCard
                        key={conn.id}
                        connection={conn}
                        onConfirm={handleConfirm}
                        onReject={handleReject}
                        onManualLink={(id) =>
                          setManualLinkTarget({
                            id,
                            handle: conn.sourceHandle,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual link modal */}
      {manualLinkTarget && (
        <ManualLinkModal
          open={true}
          onClose={() => setManualLinkTarget(null)}
          connectionId={manualLinkTarget.id}
          sourceHandle={manualLinkTarget.handle}
          onLink={handleManualLink}
        />
      )}
    </div>
  );
}
