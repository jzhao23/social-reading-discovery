import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Vercel Postgres sets POSTGRES_URL; local dev uses DATABASE_URL
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  "";

const sql = neon(connectionString);
export const db = drizzleNeon(sql, { schema });

export type Database = typeof db;
