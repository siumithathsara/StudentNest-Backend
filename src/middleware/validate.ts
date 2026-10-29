import { NextFunction, Request, Response } from "express"
import { ZodType } from "zod"

const fail = (res: Response, issues: { path: PropertyKey[]; message: string }[]) => {
  res.status(400).json({
    message: "Validation failed",
    errors: issues.map((i) => ({ field: i.path.join("."), message: i.message }))
  })
}

export const validate = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    fail(res, result.error.issues)
    return
  }
  req.body = result.data
  next()
}

export const validateQuery = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.query)
  if (!result.success) {
    fail(res, result.error.issues)
    return
  }
  res.locals.query = result.data
  next()
}