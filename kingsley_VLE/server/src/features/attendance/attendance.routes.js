import { Router } from 'express'
import {
  listAttendance,
  getAttendance,
  markAttendance,
  markBulkAttendance,
  updateAttendance,
  deleteAttendance,
} from './attendance.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// All roles can list/get (filtered by role in controller)
router.get('/', listAttendance)
router.get('/:id', getAttendance)

// Only admin/teacher can create or modify
router.post('/', authorize('admin', 'teacher'), markAttendance)
router.post('/bulk', authorize('admin', 'teacher'), markBulkAttendance)
router.put('/:id', authorize('admin', 'teacher'), updateAttendance)
router.delete('/:id', authorize('admin', 'teacher'), deleteAttendance)

export default router
