export const MAX_PENDING_BOOKINGS = 3
export const MAX_MESSAGE_LENGTH = 300
export const MOVE_IN_MAX_DAYS = 365

export const getRequestBlockedReason = (input: {
    availableRooms: number
    hasApprovedBooking: boolean
    pendingCount: number
}): string | null => {
    if (input.availableRooms < 1) return "This boarding is full."
    if (input.hasApprovedBooking) return "You already have an approved booking. Cancel it before requesting another room."
    if (input.pendingCount >= MAX_PENDING_BOOKINGS) {
        return `You already have ${MAX_PENDING_BOOKINGS} pending requests. Wait for a reply or cancel one.`
    }
    return null
}

export const buildContact = (boarding: any, owner: any) => ({
    ownerName: (owner?.name as string | undefined) ?? null,
    phone: (owner?.phone as string | undefined) ?? null,
    email: (owner?.email as string | undefined) ?? null,
    address: boarding.address as string,
    lat: boarding.location.coordinates[1] as number, // GeoJSON is [lng, lat]
    lng: boarding.location.coordinates[0] as number
})