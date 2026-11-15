import dns from "node:dns"
import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

if (process.env.NODE_ENV !== "production") {
  dns.setServers(["8.8.8.8", "1.1.1.1"])
}

export const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_LOCAL_URL || "", {
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD
  })
  console.log("DB connected..!")
}