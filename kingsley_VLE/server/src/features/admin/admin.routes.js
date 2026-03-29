import { Router } from 'express'
import { createUser, listUsers, updateUser, deleteUser, getStats, bulkCreateStudents } from './admin.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'))

router.get('/stats', getStats)
router.post('/users/bulk', bulkCreateStudents)
router.post('/users', createUser)
router.get('/users', listUsers)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

export default router
