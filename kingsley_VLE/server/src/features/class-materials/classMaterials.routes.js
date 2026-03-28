import { Router } from 'express'
import {
  listClassMaterials,
  getClassMaterial,
  createClassMaterial,
  updateClassMaterial,
  deleteClassMaterial,
} from './classMaterials.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// All authenticated users can list/get
router.get('/', listClassMaterials)
router.get('/:id', getClassMaterial)

// Only admin/teacher can create, update, delete
router.post('/', authorize('admin', 'teacher'), createClassMaterial)
router.put('/:id', authorize('admin', 'teacher'), updateClassMaterial)
router.delete('/:id', authorize('admin', 'teacher'), deleteClassMaterial)

export default router
