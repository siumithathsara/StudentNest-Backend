import mongoose from "mongoose"
import { Notification } from "../models/notification.model"
import { Role, Status, User } from "../models/user.model"
import { clientUrl, renderEmail, sendEmail } from "./email.service"

export interface NotifyInput {
  type: string
  title: string
  message: string
  link?: string
}

// notifications meant for admins are not emailed (they would only be noise)
const NO_EMAIL = new Set(["USER_REGISTERED", "BOARDING_SUBMITTED"])

export const notify = async (userId: mongoose.Types.ObjectId | string, input: NotifyInput) => {
  try {
    await Notification.create({ user: userId, ...input })
  } catch (err) {
    console.error("notify failed:", err)
    return
  }

  if (NO_EMAIL.has(input.type)) return

  try {
    const user = await User.findById(userId).select("email")
    if (!user) return
    const { html, text } = renderEmail({
      heading: input.title,
      paragraphs: [input.message],
      button: input.link ? { label: "Open StudentNest", url: `${clientUrl()}${input.link}` } : undefined
    })
    await sendEmail({ to: user.email, subject: input.title, html, text })
  } catch (err) {
    console.error("notify email failed:", err)
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