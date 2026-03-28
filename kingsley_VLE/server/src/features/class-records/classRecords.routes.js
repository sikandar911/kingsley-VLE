import { Router } from 'express'
import {
  listClassRecords,
  getClassRecord,
  createClassRecord,
  updateClassRecord,
  deleteClassRecord,
} from './classRecords.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// All authenticated users can list/get (enrolled students see records for their courses)
router.get('/', listClassRecords)
router.get('/:id', getClassRecord)

// Only admin/teacher can create, update, delete
router.post('/', authorize('admin', 'teacher'), createClassRecord)
router.put('/:id', authorize('admin', 'teacher'), updateClassRecord)
router.delete('/:id', authorize('admin', 'teacher'), deleteClassRecord)

export default router
