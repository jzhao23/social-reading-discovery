"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FeedFiltersProps {
  timeRange: string;
  activityType: string;
  onTimeRangeChange: (value: string) => void;
  onActivityTypeChange: (value: string) => void;
}

export function FeedFilters({
  timeRange,
  activityType,
  onTimeRangeChange,
  onActivityTypeChange,
}: FeedFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={timeRange} onValueChange={onTimeRangeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="week">Past week</SelectItem>
          <SelectItem value="month">Past month</SelectItem>
          <SelectItem value="year">Past year</SelectItem>
        </SelectContent>
      </Select>

      <Select value={activityType} onValueChange={onActivityTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Activity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All activities</SelectItem>
          <SelectItem value="currently_reading">Currently reading</SelectItem>
          <SelectItem value="read">Finished</SelectItem>
          <SelectItem value="rating">Rated</SelectItem>
          <SelectItem value="review">Reviewed</SelectItem>
          <SelectItem value="shelved">Shelved</SelectItem>
        </SelectContent>
      </Select>

      {(timeRange !== "all" || activityType !== "all") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onTimeRangeChange("all");
            onActivityTypeChange("all");
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
