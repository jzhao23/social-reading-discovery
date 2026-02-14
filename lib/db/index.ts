import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Works with both Neon (Vercel) and standard PostgreSQL connection strings
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzleNeon(sql, { schema });

export type Database = typeof db;
