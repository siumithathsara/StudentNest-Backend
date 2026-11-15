import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  MONGO_LOCAL_URL: z.string().min(1, "is required"),
  DB_USER: z.string().min(1, "is required"),
  DB_PASSWORD: z.string().min(1, "is required"),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "must be at least 32 characters"),
  SUPABASE_URL: z.string().url("must be a URL"),
  SUPABASE_KEY: z.string().min(1, "is required"),
  SUPABASE_BUCKET: z.string().min(1, "is required"),
  GEO_USER_AGENT: z.string().min(1, "is required")
})

export const validateEnv = () => {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    console.error("Invalid environment configuration:")
    for (const issue of result.error.issues) console.error(`  - ${issue.path.join(".")}: ${issue.message}`)
    process.exit(1)
  }

  const env = result.data
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    console.error("JWT_SECRET and JWT_REFRESH_SECRET must be different")
    process.exit(1)
  }
  if (env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
    console.error("CLIENT_URL is required in production (your frontend URL, used for CORS)")
    process.exit(1)
  }
}