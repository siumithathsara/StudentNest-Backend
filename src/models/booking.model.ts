import mongoose, { Document, Schema } from "mongoose"

export enum BookingStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}

export interface IBooking extends Document {
    _id: mongoose.Types.ObjectId
    boarding: mongoose.Types.ObjectId
    student: mongoose.Types.ObjectId
    owner: mongoose.Types.ObjectId
    moveInDate: Date
    message?: string
    status: BookingStatus
    active: boolean
    reason?: string
    decidedAt?: Date
    approvedAt?: Date
    createdAt: Date
    updatedAt: Date
}

const bookingSchema = new Schema<IBooking>(
    {
        boarding: { type: Schema.Types.ObjectId, ref: "Boarding", required: true },
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        moveInDate: { type: Date, required: true },
        message: { type: String, trim: true, maxlength: 300 },
        status: { type: String, enum: Object.values(BookingStatus), default: BookingStatus.PENDING },
        active: { type: Boolean, default: true },
        reason: { type: String, trim: true },
        decidedAt: { type: Date },
        approvedAt: { type: Date }
    },
    { timestamps: true }
)

bookingSchema.index({ student: 1, boarding: 1 }, { unique: true, partialFilterExpression: { active: true } })
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 })
bookingSchema.index({ student: 1, createdAt: -1 })
bookingSchema.index({ boarding: 1, active: 1 })

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema)