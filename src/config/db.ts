import dns from "node:dns"
import mongoose from "mongoose"
import dotenv from "dotenv"

// DEV ONLY: some local networks refuse SRV lookups used by mongodb+srv. Remove before deployment.
dns.setServers(["8.8.8.8", "1.1.1.1"])

dotenv.config()

export const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_LOCAL_URL || "", {
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD
  })
  console.log("DB connected..!")
}