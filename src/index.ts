import express, { type Request, type Response } from "express"
import cors from "cors"
import dotenv from "dotenv"
import { connectDB } from "./config/db"
import { errorHandler } from "./middleware/errorHandler"
import adminRouter from "./routes/admin.routes"
import authRouter from "./routes/auth.routes"
import boardingRouter from "./routes/boarding.routes"
import campusRouter from "./routes/campus.routes"
import geoRouter from "./routes/geo.routes"
import notificationRouter from "./routes/notification.routes"
import favoriteRouter from "./routes/favorite.routes"

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
app.use("/api/v1/campuses", campusRouter)
app.use("/api/v1/boardings", boardingRouter)
app.use("/api/v1/geo", geoRouter)
app.use("/api/v1/favorites", favoriteRouter)

app.use(errorHandler)

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => console.error("Fail to connect DB..!", err.name, err.message))