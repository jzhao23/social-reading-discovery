import { type NextAuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      authorization: {
        params: {
          scope: "users.read tweet.read follows.read offline.access",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "twitter" && account.providerAccountId) {
        try {
          // Upsert user into our database
          const existing = await db.query.users.findFirst({
            where: eq(users.twitterId, account.providerAccountId),
          });

          if (!existing) {
            await db.insert(users).values({
              email: user.email || null,
              name: user.name || null,
              image: user.image || null,
              twitterId: account.providerAccountId,
              twitterHandle:
                (profile as Record<string, unknown>)?.data
                  ? ((profile as Record<string, unknown>).data as Record<string, unknown>)?.username as string
                  : null,
            });
          } else {
            await db
              .update(users)
              .set({
                name: user.name || existing.name,
                image: user.image || existing.image,
              })
              .where(eq(users.twitterId, account.providerAccountId));
          }
        } catch (error) {
          console.error("Failed to upsert user:", error);
        }
      }
      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.twitterId = account.providerAccountId;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.twitterId) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.twitterId, token.twitterId as string),
        });

        if (dbUser) {
          session.userId = dbUser.id;
          session.twitterId = dbUser.twitterId ?? undefined;
          session.accessToken = token.accessToken;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
};

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    userId?: string;
    twitterId?: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    twitterId?: string;
  }
}
