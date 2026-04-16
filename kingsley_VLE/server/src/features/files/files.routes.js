import { Router } from 'express'
import { uploadFile, listFiles, getFile, deleteFile, getSecureFileUrl } from './files.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'
import { upload } from '../../middleware/upload.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', authorize('admin', 'teacher'), listFiles)
router.get('/:id', getFile) // All authenticated users can get file info
router.get('/:id/secure-url', getSecureFileUrl) // All authenticated users can get secure URL
router.post('/', upload.single('file'), uploadFile) // All authenticated users can upload (students for submissions)
router.delete('/:id', authorize('admin', 'teacher'), deleteFile)

export default router
