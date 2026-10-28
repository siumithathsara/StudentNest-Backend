import { NextFunction, Request, Response } from "express"
import { Role, Status, User } from "../models/user.model"
import { verifyAccessToken } from "../util/jwt"

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role }
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" })
      return
    }

    let sub: string
    try {
      sub = verifyAccessToken(header.slice(7)).sub
    } catch {
      res.status(401).json({ message: "Invalid or expired token" })
      return
    }

    const user = await User.findById(sub).select("role status")
    if (!user || user.status !== Status.APPROVED) {
      res.status(403).json({ message: "Account is not active" })
      return
    }

    req.user = { id: user._id.toString(), role: user.role }
    next()
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}