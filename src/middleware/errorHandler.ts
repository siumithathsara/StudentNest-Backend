import { NextFunction, Request, Response } from "express"
import multer from "multer"

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5MB or smaller" : err.message
    res.status(400).json({ message })
    return
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON body" })
    return
  }
  if (err?.statusCode && err.statusCode < 500) {
    res.status(err.statusCode).json({ message: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ message: "Internal server error" })
}