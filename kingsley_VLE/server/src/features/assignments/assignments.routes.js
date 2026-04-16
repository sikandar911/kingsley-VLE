import { Router } from 'express'
import {
  createAssignment,
  deleteAssignment,
  getAssignmentById,
  getAssignmentsMeta,
  gradeSubmission,
  listAssignments,
  listAssignmentSubmissions,
  submitAssignment,
  updateAssignment,
  updateAssignmentStatus,
  updateSubmission,
} from './assignments.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', listAssignments)
router.get('/meta', authorize('admin', 'teacher'), getAssignmentsMeta)
router.get('/:id', getAssignmentById)

router.post('/', authorize('admin', 'teacher'), createAssignment)
router.put('/:id', authorize('admin', 'teacher'), updateAssignment)
router.delete('/:id', authorize('admin', 'teacher'), deleteAssignment)
router.patch('/:id/status', authorize('admin', 'teacher'), updateAssignmentStatus)

router.post('/:id/submissions', authorize('student'), submitAssignment)
router.get('/:id/submissions', authorize('admin', 'teacher', 'student'), listAssignmentSubmissions)
router.patch('/submissions/:submissionId', authorize('student'), updateSubmission)
router.patch('/submissions/:submissionId/grade', authorize('admin', 'teacher'), gradeSubmission)

export default router