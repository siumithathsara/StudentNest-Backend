import mongoose, { Document, Schema } from "mongoose"

export interface IFavorite extends Document {
  student: mongoose.Types.ObjectId
  boarding: mongoose.Types.ObjectId
}

const favoriteSchema = new Schema<IFavorite>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    boarding: { type: Schema.Types.ObjectId, ref: "Boarding", required: true }
  },
  { timestamps: true }
)

favoriteSchema.index({ student: 1, boarding: 1 }, { unique: true })

export const Favorite = mongoose.model<IFavorite>("Favorite", favoriteSchema)