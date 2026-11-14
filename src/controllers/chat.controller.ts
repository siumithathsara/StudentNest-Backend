import { Request, Response } from "express"
import { Campus } from "../models/campus.model"
import { composeReply, extractQuery, type CampusRef, type ChatTurn } from "../service/ai.service"
import { searchBoardings, toCard } from "../service/search.service"
import { CHAT_MAX_RESULTS, FACILITY_OPTIONS, REPLY_BUSY, REPLY_OTHER, REPLY_UNCLEAR } from "../util/chatRules"

const FACILITY_BY_LOWER = new Map(FACILITY_OPTIONS.map((f) => [f.toLowerCase(), f]))
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

const matchCampus = (name: string | null, campuses: CampusRef[]) => {
  if (!name) return null
  const n = norm(name)
  if (!n) return null
  return (
    campuses.find((c) => norm(c.name) === n) ??
    campuses.find((c) => {
      const cn = norm(c.name)
      return !!cn && (cn.includes(n) || n.includes(cn))
    }) ??
    null
  )
}

const summary = (err: unknown) => {
  const e = err as { status?: number; message?: string }
  return `${e?.status ?? ""} ${e?.message ?? ""}`.trim()
}

export const chat = async (req: Request, res: Response) => {
  const { message, history, campusId } = req.body as { message: string; history: ChatTurn[]; campusId?: string }
  const ok = (data: { reply: string; boardings: ReturnType<typeof toCard>[]; campus: { id: string; name: string } | null }) =>
    res.json({ message: "Success", data })

  try {
    const campuses: CampusRef[] = (await Campus.find().select("name city").lean()).map((c) => ({
      id: c._id.toString(),
      name: c.name,
      city: c.city
    }))

    let parsed
    try {
      parsed = await extractQuery(message, history, campuses)
    } catch (err) {
      console.error("chat: Gemini error:", summary(err))
      res.status(503).json({ message: REPLY_BUSY })
      return
    }
    if (!parsed) {
      ok({ reply: REPLY_UNCLEAR, boardings: [], campus: null })
      return
    }
    if (parsed.intent === "other") {
      ok({ reply: REPLY_OTHER, boardings: [], campus: null })
      return
    }

  
    let items: ReturnType<typeof toCard>[] = []
    let total = 0
    let campus: CampusRef | null = null
    let applied: Record<string, unknown> = {}

    if (parsed.intent === "search") {
     
      campus = matchCampus(parsed.campusName, campuses) ?? campuses.find((c) => c.id === campusId) ?? null

      const facilities = [
        ...new Set(
          parsed.facilities
            .map((f) => FACILITY_BY_LOWER.get(f.trim().toLowerCase()))
            .filter((f): f is string => !!f)
        )
      ]
      let minRent = parsed.minRent !== null ? Math.max(0, parsed.minRent) : undefined
      let maxRent = parsed.maxRent !== null ? Math.max(0, parsed.maxRent) : undefined
      if (minRent !== undefined && maxRent !== undefined && minRent > maxRent) [minRent, maxRent] = [maxRent, minRent]
      const radiusKm = Math.min(50, Math.max(0.5, parsed.radiusKm ?? 5))
      const sort = parsed.sort ?? (campus ? "distance" : "newest")

      const result = await searchBoardings({
        campusId: campus?.id,
        radiusKm,
        minRent,
        maxRent,
        facilities,
        availableOnly: true,
        sort,
        page: 1,
        limit: CHAT_MAX_RESULTS
      })
      items = result?.items ?? []
      total = result?.total ?? 0
      applied = { minRent, maxRent, facilities, sort, ...(campus ? { radiusKm } : {}) }
    }

    let reply: string
    try {
      reply = await composeReply({
        message,
        history,
        campusName: campus?.name ?? null,
        applied,
        total,
        results: items
      })
    } catch (err) {
      console.error("chat: Gemini error (reply):", summary(err))
      reply = ""
    }
    if (!reply) {
      reply = items.length
        ? "Here is what I found."
        : "I could not find a matching boarding. Try changing the budget, distance or facilities."
    }

    ok({ reply, boardings: items, campus: campus ? { id: campus.id, name: campus.name } : null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}