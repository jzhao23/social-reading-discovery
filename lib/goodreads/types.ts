export interface GoodreadsUser {
  id: string;
  name: string;
  profileUrl: string;
  imageUrl?: string;
  bookCount?: number;
  reviewCount?: number;
  memberSince?: string;
  location?: string;
}

export interface GoodreadsBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  rating?: number;
  dateAdded?: string;
  dateRead?: string;
  userRating?: number;
  averageRating?: number;
}

export interface GoodreadsActivity {
  type: "currently_reading" | "read" | "rating" | "review" | "shelved";
  book: GoodreadsBook;
  date: string;
  reviewSnippet?: string;
  rating?: number;
}

export type ShelfType = "read" | "currently-reading" | "to-read";
