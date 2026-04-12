import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware.js'
import { upload } from '../../middleware/upload.middleware.js'
import {
  listMessages,
  sendMessage,
  toggleReaction,
  deleteMessage,
} from './courseChat.controller.js'

const router = Router({ mergeParams: true })

router.use(authenticate)

// GET  /api/course-chat/:courseId/sections/:sectionId/messages
router.get('/:courseId/sections/:sectionId/messages', listMessages)

// POST /api/course-chat/:courseId/sections/:sectionId/messages
// Supports optional file upload (teacher shares a file as class material)
router.post(
  '/:courseId/sections/:sectionId/messages',
  upload.single('file'),
  sendMessage
)

// POST .../messages/:messageId/reactions
router.post('/:courseId/sections/:sectionId/messages/:messageId/reactions', toggleReaction)

// DELETE .../messages/:messageId
router.delete('/:courseId/sections/:sectionId/messages/:messageId', deleteMessage)

export default router
