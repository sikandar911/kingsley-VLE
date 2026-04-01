import { Router } from 'express'
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent } from './events.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', listEvents)
router.get('/:id', getEvent)

router.post('/', authorize('admin', 'teacher'), createEvent)
router.put('/:id', authorize('admin', 'teacher'), updateEvent)
router.delete('/:id', authorize('admin', 'teacher'), deleteEvent)

export default router
