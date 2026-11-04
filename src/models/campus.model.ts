import mongoose, { Document, Schema } from "mongoose"

export interface ICampus extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  city: string
  location: { type: "Point"; coordinates: [number, number] } // (lng, lat)
}

const campusSchema = new Schema<ICampus>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point", required: true },
      coordinates: { type: [Number], required: true }
    }
  },
  { timestamps: true }
)

// geospatial queries ($geoNear) 
campusSchema.index({ location: "2dsphere" })

campusSchema.index({ name: 1, city: 1 }, { unique: true, collation: { locale: "en", strength: 2 } })

export const Campus = mongoose.model<ICampus>("Campus", campusSchema)