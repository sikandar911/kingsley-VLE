import { Router } from 'express'
import {
  listCourseModules,
  getCourseModule,
  createCourseModule,
  updateCourseModule,
  deleteCourseModule,
} from './courseModules.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', listCourseModules)
router.get('/:id', getCourseModule)

router.post('/', authorize('admin', 'teacher'), createCourseModule)
router.put('/:id', authorize('admin', 'teacher'), updateCourseModule)
router.delete('/:id', authorize('admin', 'teacher'), deleteCourseModule)

export default router
