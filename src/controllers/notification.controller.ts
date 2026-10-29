import { Request, Response } from "express"
import { isValidObjectId } from "mongoose"
import { Notification } from "../models/notification.model"

export const listNotifications = async (req: Request, res: Response) => {
  try {
    const { page, limit } = res.locals.query
    const filter = { user: req.user!.id }

    const [items, total, unread] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false })
    ])

    res.json({ message: "Success", data: { items, total, unread, page, limit } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const unreadCount = async (req: Request, res: Response) => {
  try {
    const count = await Notification.countDocuments({ user: req.user!.id, isRead: false })
    res.json({ message: "Success", data: { count } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const markRead = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid id" })
      return
    }
    
    const n = await Notification.findOneAndUpdate({ _id: id, user: req.user!.id }, { isRead: true })
    if (!n) {
      res.status(404).json({ message: "Notification not found" })
      return
    }
    res.json({ message: "Marked as read" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const markAllRead = async (req: Request, res: Response) => {
  try {
    await Notification.updateMany({ user: req.user!.id, isRead: false }, { isRead: true })
    res.json({ message: "All marked as read" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}