import jwt from "jsonwebtoken"
import { Role } from "../models/user.model"

export interface TokenPayload {
  sub: string
  role?: Role
}

// access token
export const signAccessToken = (user: { id: string; role: Role }) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: "15m" })

// refresh token
export const signRefreshToken = (user: { id: string }) =>
  jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: "7d" })

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as TokenPayload