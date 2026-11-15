import express, { type Request, type Response } from "express"
import cors from "cors"
import dotenv from "dotenv"
import helmet from "helmet"
import { connectDB } from "./config/db"
import { validateEnv } from "./config/env"
import { errorHandler } from "./middleware/errorHandler"
import adminRouter from "./routes/admin.routes"
import authRouter from "./routes/auth.routes"
import boardingRouter from "./routes/boarding.routes"
import bookingRouter from "./routes/booking.routes"
import campusRouter from "./routes/campus.routes"
import chatRouter from "./routes/chat.routes"
import favoriteRouter from "./routes/favorite.routes"
import geoRouter from "./routes/geo.routes"
import notificationRouter from "./routes/notification.routes"

dotenv.config()
validateEnv() 

const PORT = process.env.PORT || 3000

const app = express()

app.set("trust proxy", 1)

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean)

app.use(helmet())
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: "100kb" })) 

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" })
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/notifications", notificationRouter)
app.use("/api/v1/campuses", campusRouter)
app.use("/api/v1/boardings", boardingRouter)
app.use("/api/v1/bookings", bookingRouter)
app.use("/api/v1/geo", geoRouter)
app.use("/api/v1/favorites", favoriteRouter)
app.use("/api/v1/chat", chatRouter)

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" })
})

app.use(errorHandler)

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => console.error("Fail to connect DB..!", err.name, err.message))