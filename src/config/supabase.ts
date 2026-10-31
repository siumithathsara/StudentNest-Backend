import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "boarding-images"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_KEY

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null