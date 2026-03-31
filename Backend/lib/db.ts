import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)
