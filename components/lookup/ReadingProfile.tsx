"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  userRating?: number;
  dateAdded?: string;
  dateRead?: string;
}

interface LookupData {
  twitter: {
    id: string;
    username: string;
    name: string;
    description?: string;
    profileImageUrl?: string;
  };
  bookSignals: {
    hasGoodreadsLink: boolean;
    isBookish: boolean;
    bookKeywords: string[];
  };
  goodreads: {
    profile: {
      id: string;
      name: string;
      profileUrl: string;
      imageUrl?: string;
      bookCount?: number;
      reviewCount?: number;
    } | null;
    matchConfidence: number;
    matchMethod: string;
    currentlyReading: Book[];
    recentReads: Book[];
  } | null;
  message?: string;
}

function BookGrid({ books, title }: { books: Book[]; title: string }) {
  if (books.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {books.map((book) => (
          <div key={book.id} className="group">
            <div className="relative mb-1.5 aspect-[2/3] overflow-hidden rounded-md bg-muted shadow-sm transition-shadow group-hover:shadow-md">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 20vw"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
                  {book.title}
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-xs font-medium leading-tight">
              {book.title}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {book.author}
            </p>
            {book.userRating && book.userRating > 0 && (
              <div className="mt-0.5 flex gap-px">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={`text-[10px] ${
                      s <= book.userRating!
                        ? "text-accent"
                        : "text-muted-foreground/30"
                    }`}
                  >
                    &#9733;
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReadingProfile({ data }: { data: LookupData }) {
  const { twitter, goodreads, bookSignals } = data;

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <Card>
        <CardContent className="flex items-start gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={twitter.profileImageUrl} alt={twitter.name} />
            <AvatarFallback className="text-lg">
              {twitter.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{twitter.name}</h2>
              <span className="text-sm text-muted-foreground">
                @{twitter.username}
              </span>
            </div>
            {twitter.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {twitter.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bookSignals.isBookish && (
                <Badge variant="secondary">Book lover</Badge>
              )}
              {bookSignals.bookKeywords.slice(0, 3).map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goodreads match */}
      {goodreads ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Goodreads Profile</CardTitle>
              <Badge
                className={
                  goodreads.matchConfidence >= 0.8
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : goodreads.matchConfidence >= 0.4
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                      : ""
                }
              >
                {Math.round(goodreads.matchConfidence * 100)}% match
                ({goodreads.matchMethod.replace("_", " ")})
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {goodreads.profile && (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {goodreads.profile.imageUrl && (
                    <AvatarImage src={goodreads.profile.imageUrl} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    GR
                  </AvatarFallback>
                </Avatar>
                <div>
                  <a
                    href={goodreads.profile.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-primary"
                  >
                    {goodreads.profile.name}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {goodreads.profile.bookCount
                      ? `${goodreads.profile.bookCount} books`
                      : ""}
                    {goodreads.profile.reviewCount
                      ? ` / ${goodreads.profile.reviewCount} reviews`
                      : ""}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            <BookGrid
              books={goodreads.currentlyReading}
              title="Currently Reading"
            />

            <BookGrid books={goodreads.recentReads} title="Recently Read" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium">Not on Goodreads</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.message ||
                "We couldn't find a Goodreads profile for this user."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
