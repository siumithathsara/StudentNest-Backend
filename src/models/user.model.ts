import mongoose, { Document, Schema } from "mongoose"

export enum Role {
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  STUDENT = "STUDENT"
}

export enum Status {
  PENDING_EMAIL = "PENDING_EMAIL",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED"
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  password: string
  phone?: string
  role: Role
  status: Status
  emailVerified: boolean
  emailVerifyTokenHash?: string
  emailVerifyExpires?: Date
  rejectionReason?: string
  reapplyCount: number
  approvedBy?: mongoose.Types.ObjectId
  approvedAt?: Date
  passwordResetTokenHash?: string
  passwordResetExpires?: Date
  passwordChangedAt?: Date
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: Object.values(Role), required: true },
    status: { type: String, enum: Object.values(Status), default: Status.PENDING_APPROVAL },
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    rejectionReason: String,
    reapplyCount: { type: Number, default: 0 },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: Date

  },
  { timestamps: true }
)

export const User = mongoose.model<IUser>("User", userSchema)