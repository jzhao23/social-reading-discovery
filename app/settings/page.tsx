"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [discoverable, setDiscoverable] = useState(true);
  const [refreshFrequency, setRefreshFrequency] = useState("weekly");

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
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Connected accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback>
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "X"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">X / Twitter</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.name || "Connected"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Disconnect
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-xs">BS</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">BlueSky</p>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="discoverable">
                Allow others to find me through social connections
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, other users can discover your Goodreads profile
                through social graph imports.
              </p>
            </div>
            <Switch
              id="discoverable"
              checked={discoverable}
              onCheckedChange={setDiscoverable}
            />
          </div>
        </CardContent>
      </Card>

      {/* Import settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Refresh frequency</Label>
              <p className="text-xs text-muted-foreground">
                How often to re-scan your social graph for new connections.
              </p>
            </div>
            <Select
              value={refreshFrequency}
              onValueChange={setRefreshFrequency}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Delete all data</p>
              <p className="text-xs text-muted-foreground">
                Remove all imports, connections, and feed data. This cannot be
                undone.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
