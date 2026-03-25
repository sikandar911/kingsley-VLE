import { Router } from 'express'
import { listSections, getSection, createSection, updateSection, deleteSection } from './sections.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', listSections)
router.get('/:id', getSection)
router.post('/', authorize('admin'), createSection)
router.put('/:id', authorize('admin'), updateSection)
router.delete('/:id', authorize('admin'), deleteSection)

export default router
