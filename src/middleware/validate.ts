import { NextFunction, Request, Response } from "express"
import { ZodType } from "zod"

export const validate = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    })
    return
  }
  req.body = result.data 
  next()
}