import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import mongoose from "mongoose"
import { connectDB } from "../config/db"
import { Role, Status, User } from "../models/user.model"

dotenv.config()

const run = async () => {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env")

  await connectDB()

  if (await User.findOne({ role: Role.ADMIN })) {
    console.log("Admin already exists. Nothing to do.")
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || "Platform Admin",
      email,
      password: await bcrypt.hash(password, 10),
      role: Role.ADMIN,
      status: Status.APPROVED,
      emailVerified: true
    })
    console.log(`Admin created: ${email}`)
  }

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})