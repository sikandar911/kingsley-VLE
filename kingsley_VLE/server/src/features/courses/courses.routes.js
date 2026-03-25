import { Router } from 'express'
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse } from './courses.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

// Authenticated for all
router.use(authenticate)

router.get('/', listCourses)
router.get('/:id', getCourse)
router.post('/', authorize('admin'), createCourse)
router.put('/:id', authorize('admin'), updateCourse)
router.delete('/:id', authorize('admin'), deleteCourse)

export default router
