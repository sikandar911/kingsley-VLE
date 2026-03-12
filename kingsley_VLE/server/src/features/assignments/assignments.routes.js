import { Router } from 'express'
import {
  createAssignment,
  getAssignmentById,
  gradeSubmission,
  listAssignments,
  listAssignmentSubmissions,
  submitAssignment,
  updateAssignment,
  updateAssignmentStatus,
} from './assignments.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', listAssignments)
router.get('/:id', getAssignmentById)

router.post('/', authorize('admin', 'teacher'), createAssignment)
router.put('/:id', authorize('admin', 'teacher'), updateAssignment)
router.patch('/:id/status', authorize('admin', 'teacher'), updateAssignmentStatus)

router.post('/:id/submissions', authorize('student'), submitAssignment)
router.get('/:id/submissions', authorize('admin', 'teacher'), listAssignmentSubmissions)
router.patch('/submissions/:submissionId/grade', authorize('admin', 'teacher'), gradeSubmission)

export default router