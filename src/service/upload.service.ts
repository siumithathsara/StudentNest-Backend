import crypto from "crypto"
import { supabase, SUPABASE_BUCKET } from "../config/supabase"

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
}

export interface StoredImage {
  url: string
  path: string
}

export const uploadImages = async (folder: string, files: Express.Multer.File[]): Promise<StoredImage[]> => {
  if (!supabase) throw new Error("Image storage is not configured (SUPABASE_URL / SUPABASE_KEY)")

  const uploaded: StoredImage[] = []
  try {
    for (const file of files) {
     
      const path = `${folder}/${crypto.randomUUID()}.${EXT[file.mimetype]}`
      const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, file.buffer, {
        contentType: file.mimetype
      })
      if (error) throw new Error(`Upload failed: ${error.message}`)

      const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path)
      uploaded.push({ url: data.publicUrl, path })
    }
    return uploaded
  } catch (err) {
    await deleteImages(uploaded.map((u) => u.path)) 
    throw err
  }
}

export const deleteImages = async (paths: string[]) => {
  if (!supabase || paths.length === 0) return
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove(paths)
  if (error) console.error("Image delete failed:", error.message)
}