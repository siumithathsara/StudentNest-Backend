import mongoose, { Document, Schema } from "mongoose"

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  type: string
  title: string
  message: string
  link?: string
  isRead: boolean
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
)

// to get quick noti 
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>("Notification", notificationSchema)