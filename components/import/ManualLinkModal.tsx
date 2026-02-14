"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ManualLinkModalProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  sourceHandle: string | null;
  onLink: (connectionId: string, goodreadsUserId: string) => void;
}

export function ManualLinkModal({
  open,
  onClose,
  connectionId,
  sourceHandle,
  onLink,
}: ManualLinkModalProps) {
  const [goodreadsUrl, setGoodreadsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);

    // Extract Goodreads user ID from URL or direct input
    let goodreadsUserId = goodreadsUrl.trim();

    // Try to parse as URL
    const idMatch = goodreadsUserId.match(
      /goodreads\.com\/user\/show\/(\d+)/
    );
    if (idMatch) {
      goodreadsUserId = idMatch[1];
    }

    // Try numeric ID
    if (!/^\d+$/.test(goodreadsUserId)) {
      setError(
        "Please enter a valid Goodreads user ID or profile URL (e.g., https://www.goodreads.com/user/show/12345)"
      );
      return;
    }

    onLink(connectionId, goodreadsUserId);
    setGoodreadsUrl("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Link @{sourceHandle || "unknown"} to Goodreads
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goodreads-url">
              Goodreads profile URL or user ID
            </Label>
            <Input
              id="goodreads-url"
              placeholder="https://www.goodreads.com/user/show/12345"
              value={goodreadsUrl}
              onChange={(e) => {
                setGoodreadsUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Find the profile URL by searching for the person on goodreads.com
            and copying the URL from your browser.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!goodreadsUrl.trim()}>
            Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
