import express, { type Request, type Response } from "express"
import cors from "cors"
import dotenv from "dotenv"
import { connectDB } from "./config/db"
import authRouter from "./routes/auth.routes"
import adminRouter from "./routes/admin.routes"                    
import notificationRouter from "./routes/notification.routes"

dotenv.config()

const PORT = process.env.PORT || 3000

const app = express()

app.use(cors({ origin: "http://localhost:5173" }))
app.use(express.json())

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" })
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/admin", adminRouter)                            
app.use("/api/v1/notifications", notificationRouter) 

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => console.error("Fail to connect DB..!", err.name, err.message))