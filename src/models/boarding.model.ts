import mongoose, { Document, Schema } from "mongoose"

export enum BoardingStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export interface IBoarding extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  description: string
  city: string
  address: string
  monthlyRent: number
  totalRooms: number
  availableRooms: number
  facilities: string[]
  location: { type: "Point"; coordinates: [number, number] } // (lng, lat)
  images: { url: string; path: string }[]
  owner: mongoose.Types.ObjectId
  status: BoardingStatus
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const boardingSchema = new Schema<IBoarding>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    monthlyRent: { type: Number, required: true, min: 0 },
    totalRooms: { type: Number, required: true, min: 1 },
    availableRooms: { type: Number, required: true, min: 0 },
    facilities: { type: [String], default: [] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point", required: true },
      coordinates: { type: [Number], required: true }
    },
    images: [
      {
        _id: false,
        url: { type: String, required: true },
        path: { type: String, required: true }
      }
    ],
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: Object.values(BoardingStatus), default: BoardingStatus.PENDING },
    rejectionReason: { type: String }
  },
  { timestamps: true }
)

boardingSchema.index({ location: "2dsphere" })
boardingSchema.index({ status: 1, monthlyRent: 1 })

export const Boarding = mongoose.model<IBoarding>("Boarding", boardingSchema)