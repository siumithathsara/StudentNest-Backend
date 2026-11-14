import { Request, Response } from "express"
import { Campus } from "../models/campus.model"
import { answerForRole, composeReply, extractQuery, type CampusRef, type ChatTurn } from "../service/ai.service"
import { searchBoardings, toCard } from "../service/search.service"
import { faqAnswer, looksLikeQuestion, otherReply, smallTalk, SUGGESTIONS } from "../util/chatLocal"
import { CHAT_MAX_RESULTS, FACILITY_OPTIONS, REPLY_BUSY, REPLY_UNCLEAR, type ChatRole } from "../util/chatRules"

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

const searchFallback = (count: number, total: number, campusName?: string) =>
  count > 0
    ? `I found ${total} matching ${total === 1 ? "boarding" : "boardings"}${campusName ? ` near ${campusName}` : ""}. Here ${
        count === 1 ? "it is" : `are the top ${count}`
      }.`
    : "I could not find a matching boarding. Try changing the budget, distance or facilities."

type Payload = {
  reply: string
  boardings?: ReturnType<typeof toCard>[]
  campus?: { id: string; name: string } | null
  suggestions?: string[]
}

export const chat = async (req: Request, res: Response) => {
  const { message, history, campusId } = req.body as { message: string; history: ChatTurn[]; campusId?: string }
  const role = req.user!.role as ChatRole
  const suggestions = SUGGESTIONS[role]

  const ok = (p: Payload) => res.json({ message: "Success", data: { boardings: [], campus: null, suggestions: [], ...p } })
  const busy = () => res.status(503).json({ message: REPLY_BUSY })

  try {
  
    const talk = smallTalk(message, role)
    if (talk) {
      ok(talk)
      return
    }

    if (looksLikeQuestion(message)) {
      const faq = faqAnswer(message, role)
      if (faq) {
        ok(faq)
        return
      }
    }

    if (role !== "STUDENT") {
      try {
        const text = await answerForRole(role, message, history)
        ok({ reply: text || otherReply(role), suggestions })
      } catch (err) {
        console.error("chat: Gemini error:", summary(err))
        const faq = faqAnswer(message, role)
        if (faq) ok(faq)
        else busy()
      }
      return
    }

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
      const faq = faqAnswer(message, role)
      if (faq) ok(faq)
      else busy()
      return
    }
    if (!parsed) {
      ok({ reply: REPLY_UNCLEAR, suggestions })
      return
    }
    if (parsed.intent === "other") {
      ok({ reply: otherReply(role), suggestions })
      return
    }
    if (parsed.intent === "info") {
      ok({ reply: parsed.answer || faqAnswer(message, role)?.reply || otherReply(role), suggestions })
      return
    }

    const campus = matchCampus(parsed.campusName, campuses) ?? campuses.find((c) => c.id === campusId) ?? null

    const facilities = [
      ...new Set(
        parsed.facilities.map((f) => FACILITY_BY_LOWER.get(f.trim().toLowerCase())).filter((f): f is string => !!f)
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
    const items = result?.items ?? []
    const total = result?.total ?? 0
    const applied = { minRent, maxRent, facilities, sort, ...(campus ? { radiusKm } : {}) }

    let reply = ""
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
    }
    if (!reply) reply = searchFallback(items.length, total, campus?.name)

    ok({
      reply,
      boardings: items,
      campus: campus ? { id: campus.id, name: campus.name } : null,
      suggestions: items.length > 0 ? ["Cheapest first", "Nearest first", "How do I book a room?"] : suggestions
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}