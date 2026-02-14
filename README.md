# Social Reading Discovery

Discover what your Twitter/X circle is reading on Goodreads. Import your social graph, resolve accounts to Goodreads profiles, and browse a curated feed of books your network is reading, rating, and recommending.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjzhao23%2Fsocial-reading-discovery&env=NEXTAUTH_SECRET,TWITTER_CLIENT_ID,TWITTER_CLIENT_SECRET&envDescription=Required%20environment%20variables%20for%20Social%20Reading%20Discovery&envLink=https%3A%2F%2Fgithub.com%2Fjzhao23%2Fsocial-reading-discovery%23environment-variables&project-name=social-reading-discovery&stores=[{"type":"postgres"}])

> Vercel auto-provisions a Postgres database. You'll be prompted for the 3 other env vars listed below.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Vercel Postgres or [Neon](https://neon.tech) free tier works. If you use the deploy button with the Postgres store, this is set automatically. |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption. Generate one: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Auto | Your app URL. Vercel sets this automatically in production. Set to `http://localhost:3000` for local dev. |
| `TWITTER_CLIENT_ID` | Yes | Twitter/X OAuth 2.0 Client ID (see setup below) |
| `TWITTER_CLIENT_SECRET` | Yes | Twitter/X OAuth 2.0 Client Secret |
| `REDIS_URL` | No | Optional. Enables background job queues and caching. Without it, jobs run inline and caching is skipped. Works fine without for moderate usage. |
| `GOODREADS_USE_MOBILE_API` | No | Set to `true` to use Goodreads mobile API instead of HTML scraping. Default: `false` |

## Getting Twitter/X API Keys

1. Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app
3. Under **User authentication settings**, enable OAuth 2.0
4. Set the app type to **Web App**
5. Add callback URLs:
   - Production: `https://your-domain.vercel.app/api/auth/callback/twitter`
   - Local: `http://localhost:3000/api/auth/callback/twitter`
6. Copy the **Client ID** and **Client Secret** into your environment variables

## Getting a Database

**Option A: Vercel Postgres (easiest)**
- The deploy button above includes a Postgres store. Vercel provisions it automatically.

**Option B: Neon (free tier)**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a project
3. Copy the connection string into `DATABASE_URL`

**Option C: Any PostgreSQL**
- Any PostgreSQL 14+ instance works. Use the standard `postgresql://` connection string.

After connecting your database, run migrations:

```bash
npx drizzle-kit push:pg
```

## Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.local.example .env.local

# Push database schema
npx drizzle-kit push:pg

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
Twitter OAuth -> Fetch Following -> Identity Resolution -> Goodreads Scraper -> Feed
                                    (5-tier pipeline)
```

- **Tier 1**: Goodreads URL in Twitter bio (95% confidence)
- **Tier 2**: Email match across platforms (90%)
- **Tier 3**: Fuzzy display name matching (40-70%)
- **Tier 4**: Username match on Goodreads (60%)
- **Tier 5**: Manual user confirmation

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- PostgreSQL + Drizzle ORM
- NextAuth.js (Twitter OAuth 2.0)
- BullMQ + Redis (optional, for background jobs)
- Cheerio (Goodreads HTML scraping)
