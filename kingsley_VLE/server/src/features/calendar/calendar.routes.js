import { Router } from 'express'
import {
  getCalendarReminders,
  getRemindersByDate,
  createReminder,
  updateReminder,
  deleteReminder,
} from './calendar.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD  → month/range view
router.get('/', getCalendarReminders)

// GET /api/calendar/:date  → single date detail (MUST come before /reminders/:id)
router.get('/:date(\\d{4}-\\d{2}-\\d{2})', getRemindersByDate)

// CRUD for manual reminders
router.post('/', authorize('admin', 'teacher'), createReminder)
router.put('/reminders/:id', authorize('admin', 'teacher'), updateReminder)
router.delete('/reminders/:id', authorize('admin', 'teacher'), deleteReminder)

export default router
