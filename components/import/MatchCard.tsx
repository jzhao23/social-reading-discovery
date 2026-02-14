"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MatchConnection {
  id: string;
  sourceHandle: string | null;
  sourceDisplayName: string | null;
  sourceProfileUrl: string | null;
  goodreadsUserId: string | null;
  matchConfidence: number;
  matchMethod: string | null;
  verifiedByUser: boolean;
}

interface MatchCardProps {
  connection: MatchConnection;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onManualLink: (id: string) => void;
}

function confidenceBadge(confidence: number, verified: boolean) {
  if (verified) {
    return <Badge variant="default">Verified</Badge>;
  }
  if (confidence >= 0.8) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        High
      </Badge>
    );
  }
  if (confidence >= 0.4) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Medium
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Low
    </Badge>
  );
}

export function MatchCard({
  connection,
  onConfirm,
  onReject,
  onManualLink,
}: MatchCardProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (
    action: () => void
  ) => {
    setLoading(true);
    action();
    // Loading state will be cleared by parent re-render
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Twitter side */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
              {(connection.sourceDisplayName || connection.sourceHandle || "?")
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {connection.sourceDisplayName || "Unknown"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{connection.sourceHandle || "unknown"}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-muted-foreground">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </div>

        {/* Goodreads side */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {connection.goodreadsUserId ? (
            <>
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  GR
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <a
                  href={`https://www.goodreads.com/user/show/${connection.goodreadsUserId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium hover:text-primary"
                >
                  Goodreads #{connection.goodreadsUserId}
                </a>
                <p className="text-xs text-muted-foreground">
                  via {connection.matchMethod?.replace("_", " ") || "unknown"}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No match found</p>
          )}
        </div>

        {/* Confidence + Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {connection.goodreadsUserId &&
            confidenceBadge(
              connection.matchConfidence,
              connection.verifiedByUser
            )}

          {connection.goodreadsUserId && !connection.verifiedByUser && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-green-700 hover:bg-green-50 hover:text-green-800"
                onClick={() => handleAction(() => onConfirm(connection.id))}
                disabled={loading}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:bg-red-50"
                onClick={() => handleAction(() => onReject(connection.id))}
                disabled={loading}
              >
                Reject
              </Button>
            </div>
          )}

          {!connection.goodreadsUserId && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => handleAction(() => onManualLink(connection.id))}
              disabled={loading}
            >
              Link manually
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
