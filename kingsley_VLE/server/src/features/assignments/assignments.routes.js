import { Router } from 'express'
import {
  createAssignment,
  deleteAssignment,
  deleteSubmissionAttempt,
  getAssignmentById,
  getAssignmentsMeta,
  gradeSubmission,
  listAssignments,
  listAssignmentSubmissions,
  submitAssignment,
  updateAssignment,
  updateAssignmentStatus,
  updateSubmission,
  reviewAttempt,
  qualifyAttemptForEqa,
  studentSelectAttempt,
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

// Attempt-level operations (submissionId param is actually attemptId for edit)
router.patch('/submissions/:submissionId', authorize('student'), updateSubmission)
router.patch('/submissions/:submissionId/grade', authorize('admin', 'teacher'), gradeSubmission)

// IQA / EQA workflow
router.patch('/attempts/:attemptId/feedback', authorize('admin', 'teacher'), reviewAttempt)
router.patch('/attempts/:attemptId/qualify', authorize('admin', 'teacher'), qualifyAttemptForEqa)
router.patch('/attempts/:attemptId/student-select', authorize('student'), studentSelectAttempt)
router.delete('/attempts/:attemptId', authorize('student', 'admin', 'teacher'), deleteSubmissionAttempt)

export default router