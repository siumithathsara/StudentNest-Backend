export const ROAD_FACTOR = 1.3
export const WALK_KMH = 5
export const VEHICLE_KMH = 20

const BOUNDS = { minLat: 5.8, maxLat: 9.95, minLng: 79.4, maxLng: 82.0 }

export const isInSriLanka = (lat: number, lng: number) =>
  lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng

export const estimateTravel = (straightMeters: number) => {
  const straightKm = straightMeters / 1000
  const roadKm = straightKm * ROAD_FACTOR
  return {
    distanceKm: Math.round(straightKm * 10) / 10,
    walkMinutes: Math.round((roadKm / WALK_KMH) * 60),
    vehicleMinutes: Math.round((roadKm / VEHICLE_KMH) * 60)
  }
}