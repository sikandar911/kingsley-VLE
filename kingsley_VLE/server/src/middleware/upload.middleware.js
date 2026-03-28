import multer from 'multer'

// Store files in memory so we can forward the buffer to Azure
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
})
