import crypto from "node:crypto"
import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import { Role, Status, User } from "../models/user.model"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../util/jwt"
import { notifyAdmins } from "../service/notification.service"
import { clientUrl, renderEmail, sendEmail } from "../service/email.service"

const RESET_MINUTES = 30
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex")

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
    let payload
    try {
      payload = verifyRefreshToken(req.body.refreshToken)
    } catch {
      res.status(401).json({ message: "Invalid or expired refresh token" })
      return
    }

    const user = await User.findById(payload.sub).select("role status passwordChangedAt")
    if (!user || user.status !== Status.APPROVED) {
      res.status(403).json({ message: "Account is not active" })
      return
    }

    if (
      user.passwordChangedAt &&
      payload.iat !== undefined &&
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      res.status(401).json({ message: "Your session has ended. Please log in again." })
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

export const forgotPassword = async (req: Request, res: Response) => {

  const answer = { message: "If an account exists for that email, we have sent a password reset link." }

  try {
    const user = await User.findOne({ email: req.body.email })

    if (user && user.status !== Status.REJECTED && user.status !== Status.SUSPENDED) {
      const token = crypto.randomBytes(32).toString("hex")

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetTokenHash: hashToken(token),
            passwordResetExpires: new Date(Date.now() + RESET_MINUTES * 60 * 1000)
          }
        }
      )

      const link = `${clientUrl()}/reset-password?token=${token}`
      const { html, text } = renderEmail({
        heading: "Reset your password",
        paragraphs: [
          `Hi ${user.name}, we received a request to reset your StudentNest password.`,
          `This link works for ${RESET_MINUTES} minutes and can be used only once.`
        ],
        button: { label: "Reset password", url: link },
        footer: "If you did not ask for this, you can ignore this email. Your password will not change."
      })

      const sent = await sendEmail({ to: user.email, subject: "Reset your StudentNest password", html, text })
      if (!sent && process.env.NODE_ENV !== "production") console.log("DEV reset link (email not sent):", link)
    }

    res.json(answer)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body
    const hashed = await bcrypt.hash(password, 10)

    const user = await User.findOneAndUpdate(
      { passwordResetTokenHash: hashToken(token), passwordResetExpires: { $gt: new Date() } },
      {
        $set: { password: hashed, passwordChangedAt: new Date() },
        $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 }
      },
      { returnDocument: "after" }
    )

    if (!user) {
      res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." })
      return
    }

    const { html, text } = renderEmail({
      heading: "Your password was changed",
      paragraphs: [
        `Hi ${user.name}, the password of your StudentNest account was just changed.`,
        "If this was not you, please reset your password again right away."
      ]
    })
    await sendEmail({ to: user.email, subject: "Your StudentNest password was changed", html, text })

    res.json({ message: "Your password has been updated. You can now log in." })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
  }
}