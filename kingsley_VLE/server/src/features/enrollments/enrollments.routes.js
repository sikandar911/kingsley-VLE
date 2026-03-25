import { Router } from 'express'
import {
  listEnrollments, createEnrollment, getEnrollment, deleteEnrollment,
  listTeacherCourses, createTeacherCourse, deleteTeacherCourse,
} from './enrollments.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// ── Teacher-course assignments (registered BEFORE /:id to avoid conflict) ────
router.get('/teachers', listTeacherCourses)
router.post('/teachers', authorize('admin'), createTeacherCourse)
router.delete('/teachers/:id', authorize('admin'), deleteTeacherCourse)

// ── Student enrollments ───────────────────────────────────────────────────────
router.get('/', listEnrollments)
router.post('/', authorize('admin'), createEnrollment)
router.get('/:id', getEnrollment)
router.delete('/:id', authorize('admin'), deleteEnrollment)

export default router
