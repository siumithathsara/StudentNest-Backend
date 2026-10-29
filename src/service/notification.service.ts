import mongoose from "mongoose"
import { Notification } from "../models/notification.model"
import { Role, Status, User } from "../models/user.model"

export interface NotifyInput {
  type: string
  title: string
  message: string
  link?: string 
}


export const notify = async (userId: mongoose.Types.ObjectId | string, input: NotifyInput) => {
  try {
    await Notification.create({ user: userId, ...input })
  } catch (err) {
    console.error("notify failed:", err)
  }
}

export const notifyAdmins = async (input: NotifyInput) => {
  try {
    const admins = await User.find({ role: Role.ADMIN, status: Status.APPROVED }).select("_id")
    await Promise.all(admins.map((a) => notify(a._id, input)))
  } catch (err) {
    console.error("notifyAdmins failed:", err)
  }
}