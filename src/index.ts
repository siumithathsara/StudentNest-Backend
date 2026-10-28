import dns from "node:dns"
import express, { type Request, type Response } from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"

// DEV ONLY: some local networks refuse SRV lookups used by mongodb+srv. Remove before deployment.
dns.setServers(["8.8.8.8", "1.1.1.1"])

dotenv.config()

const MONGO_URL = process.env.MONGO_LOCAL_URL || ""
const PORT = process.env.PORT || 3000

const app = express()

app.use(cors({ origin: "http://localhost:5173" }))
app.use(express.json())

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" })
})

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("DB connected..!")

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => console.error("Fail to connect DB..!", err.message))