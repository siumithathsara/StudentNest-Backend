import { NextFunction, Request, Response } from "express"
import { Role } from "../models/user.model"

export const requireRole = (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" })
    return
  }
  if (!roles.includes(req.user.role)) {
    res.status(403).json({ message: `Requires one of: ${roles.join(", ")}` })
    return
  }
  next()
}