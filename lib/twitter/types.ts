export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  entities?: {
    url?: {
      urls: Array<{
        start: number;
        end: number;
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
    };
    description?: {
      urls: Array<{
        start: number;
        end: number;
        url: string;
        expanded_url: string;
        display_url: string;
      }>;
    };
  };
}

export interface TwitterFollowingResponse {
  data: TwitterUser[];
  meta: {
    result_count: number;
    next_token?: string;
  };
}

export interface BookSignals {
  hasGoodreadsLink: boolean;
  goodreadsUrl?: string;
  isBookish: boolean;
  bookKeywords: string[];
}
