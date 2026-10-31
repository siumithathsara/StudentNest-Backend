import multer from "multer"

export const MAX_IMAGES = 8
const ALLOWED = ["image/jpeg", "image/png", "image/webp"]

export const uploadImagesMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(Object.assign(new Error("Only jpg, png or webp images are allowed"), { statusCode: 400 }))
    }
  }
}).array("images", MAX_IMAGES)