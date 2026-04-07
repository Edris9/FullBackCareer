import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL saknas i .env.local")
}

const sql = neon(connectionString)
export const db = drizzle(sql)