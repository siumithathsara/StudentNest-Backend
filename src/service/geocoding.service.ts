const BASE = "https://nominatim.openstreetmap.org"
const USER_AGENT = process.env.GEO_USER_AGENT || "StudentNest/1.0"
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

interface NominatimPlace {
  display_name?: string
  lat: string
  lon: string
  address?: Record<string, string>
}

const cache = new Map<string, { expires: number; value: unknown }>()
let queue: Promise<unknown> = Promise.resolve()
let lastCall = 0

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const throttled = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(async () => {
    const wait = 1100 - (Date.now() - lastCall)
    if (wait > 0) await sleep(wait)
    lastCall = Date.now()
    return fn()
  })
  queue = run.catch(() => undefined)
  return run
}

const request = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const url = `${BASE}${path}?${new URLSearchParams(params).toString()}`

  const hit = cache.get(url)
  if (hit && hit.expires > Date.now()) return hit.value as T

  const value = await throttled(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" } })
    if (!res.ok) throw new Error(`Geocoder responded with ${res.status}`)
    return res.json()
  })

  cache.set(url, { expires: Date.now() + CACHE_TTL, value })
  return value as T
}

const cityOf = (a?: Record<string, string>) => a?.city || a?.town || a?.village || a?.suburb || a?.county || ""

const variants = (q: string) => {
  const list = [q]
  const simpler = q
    .replace(/\b(campus|university|institute|college)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (simpler.length >= 3 && simpler.toLowerCase() !== q.toLowerCase()) list.push(simpler)
  return list
}

export const searchPlaces = async (q: string) => {
  for (const text of variants(q)) {
    const rows = await request<NominatimPlace[]>("/search", {
      q: text,
      format: "jsonv2",
      countrycodes: "lk",
      limit: "5",
      addressdetails: "1"
    })
    if (rows.length > 0) {
      return rows.map((r) => ({
        name: r.display_name ?? "",
        lat: Number(r.lat),
        lng: Number(r.lon),
        city: cityOf(r.address)
      }))
    }
  }
  return []
}

export const reversePlace = async (lat: number, lng: number) => {
  const r = await request<NominatimPlace>("/reverse", {
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1"
  })
  return { address: r.display_name ?? "", city: cityOf(r.address) }
}