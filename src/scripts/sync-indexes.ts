import dotenv from "dotenv"
import mongoose from "mongoose"
import { connectDB } from "../config/db"
import { Campus } from "../models/campus.model"
import { Booking } from "../models/booking.model"

dotenv.config()

const run = async () => {
  await connectDB()
  const dropped = await Campus.syncIndexes()
  console.log("Campus indexes synced. Dropped:", dropped)

  const droppedBookings = await Booking.syncIndexes()
  console.log("Booking indexes synced. Dropped:", droppedBookings)

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})