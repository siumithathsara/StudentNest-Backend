import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import { Role, Status, User } from "../models/user.model"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../util/jwt"
import { notifyAdmins } from "../service/notification.service"

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phone } = req.body

    if (await User.findOne({ email })) {
      res.status(409).json({ message: "Email already registered" })
      return
    }

    const user = await User.create({
      name,
      email,
      phone,
      role: role as Role,
      password: await bcrypt.hash(password, 10)
    })

      await notifyAdmins({
      type: "USER_REGISTERED",
      title: `New ${role.toLowerCase()} registered`,
      message: `${user.name} (${user.email}) is waiting for approval.`,
      link: "/admin/users"
    })

    res.status(201).json({
      message: "Registered. Your account is waiting for admin approval.",
      data: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status }
    })
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ message: "Email already registered" })
      return
    }
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select("+password")
    const valid = user ? await bcrypt.compare(password, user.password) : false

    if (!user || !valid) {
      res.status(401).json({ message: "Invalid email or password" })
      return
    }

    if (user.status === Status.PENDING_EMAIL) {
      res.status(403).json({ message: "Please verify your email first", code: "EMAIL_NOT_VERIFIED" })
      return
    }
    if (user.status === Status.PENDING_APPROVAL) {
      res.status(403).json({ message: "Your account is waiting for admin approval", code: "ACCOUNT_PENDING" })
      return
    }
    if (user.status === Status.REJECTED) {
      res.status(403).json({
        message: `Your application was rejected: ${user.rejectionReason ?? "no reason given"}`,
        code: "ACCOUNT_REJECTED"
      })
      return
    }
    if (user.status === Status.SUSPENDED) {
      res.status(403).json({ message: "Your account has been suspended", code: "ACCOUNT_SUSPENDED" })
      return
    }

    const id = user._id.toString()
    res.json({
      message: "Success",
      data: {
        user: { id, name: user.name, email: user.email, role: user.role },
        accessToken: signAccessToken({ id, role: user.role }),
        refreshToken: signRefreshToken({ id })
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const refresh = async (req: Request, res: Response) => {
  try {
    let sub: string
    try {
      sub = verifyRefreshToken(req.body.refreshToken).sub
    } catch {
      res.status(401).json({ message: "Invalid or expired refresh token" })
      return
    }

    const user = await User.findById(sub).select("role status")
    if (!user || user.status !== Status.APPROVED) {
      res.status(403).json({ message: "Account is not active" })
      return
    }

    res.json({
      message: "Success",
      data: { accessToken: signAccessToken({ id: user._id.toString(), role: user.role }) }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const me = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id)
    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }
    res.json({
      message: "Success",
      data: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, status: user.status }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}