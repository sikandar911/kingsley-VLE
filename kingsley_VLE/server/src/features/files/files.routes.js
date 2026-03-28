import { Router } from 'express'
import { uploadFile, listFiles, getFile, deleteFile } from './files.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'
import { upload } from '../../middleware/upload.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', authorize('admin', 'teacher'), listFiles)
router.get('/:id', authorize('admin', 'teacher'), getFile)
router.post('/', authorize('admin', 'teacher'), upload.single('file'), uploadFile)
router.delete('/:id', authorize('admin', 'teacher'), deleteFile)

export default router
