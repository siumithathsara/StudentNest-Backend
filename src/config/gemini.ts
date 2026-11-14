import { GoogleGenAI } from "@google/genai"

let client: GoogleGenAI | null = null

export const getGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  client ??= new GoogleGenAI({ apiKey })
  return client
}

export const getModel = () => process.env.GEMINI_MODEL || "gemini-3.5-flash"