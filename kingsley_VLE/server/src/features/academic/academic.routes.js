import { Router } from 'express'
import {
  listSessions, getSession, createSession, updateSession, deleteSession,
  listSemesters, getSemester, createSemester, updateSemester, deleteSemester,
} from './academic.controller.js'
import { authenticate, authorize } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get('/sessions', listSessions)
router.get('/sessions/:id', getSession)
router.post('/sessions', authorize('admin'), createSession)
router.put('/sessions/:id', authorize('admin'), updateSession)
router.delete('/sessions/:id', authorize('admin'), deleteSession)

// ── Semesters ─────────────────────────────────────────────────────────────────
router.get('/semesters', listSemesters)
router.get('/semesters/:id', getSemester)
router.post('/semesters', authorize('admin'), createSemester)
router.put('/semesters/:id', authorize('admin'), updateSemester)
router.delete('/semesters/:id', authorize('admin'), deleteSemester)

export default router
