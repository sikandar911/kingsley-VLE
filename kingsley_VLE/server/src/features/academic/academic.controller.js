import prisma from '../../config/prisma.js'

// ============================================================================
// SESSION CRUD
// ============================================================================

/**
 * @swagger
 * tags:
 *   name: Academic
 *   description: Sessions and Semesters management
 */

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: List all sessions with their semesters
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 */
export const listSessions = async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        semesters: {
          select: { id: true, name: true, year: true, monthsIncluded: true },
        },
      },
    })
    return res.json(sessions)
  } catch (err) {
    console.error('listSessions error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get a session by ID
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getSession = async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        semesters: true,
      },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    return res.json(session)
  } catch (err) {
    console.error('getSession error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Create a new session (admin only)
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 */
export const createSession = async (req, res) => {
  const { name, description, startDate, endDate } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Session name is required' })

  try {
    const session = await prisma.session.create({
      data: {
        name: name.trim(),
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    return res.status(201).json(session)
  } catch (err) {
    console.error('createSession error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sessions/{id}:
 *   put:
 *     summary: Update a session (admin only)
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Updated session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 */
export const updateSession = async (req, res) => {
  const { name, description, startDate, endDate } = req.body
  try {
    const existing = await prisma.session.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Session not found' })

    const session = await prisma.session.update({
      where: { id: req.params.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
    })
    return res.json(session)
  } catch (err) {
    console.error('updateSession error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Delete a session (admin only)
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export const deleteSession = async (req, res) => {
  try {
    const existing = await prisma.session.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Session not found' })
    await prisma.session.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Session deleted successfully' })
  } catch (err) {
    console.error('deleteSession error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// ============================================================================
// SEMESTER CRUD
// ============================================================================

/**
 * @swagger
 * /api/semesters:
 *   get:
 *     summary: List semesters, optionally filtered by session
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *         description: Filter by session ID
 *     responses:
 *       200:
 *         description: List of semesters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Semester'
 */
export const listSemesters = async (req, res) => {
  const { sessionId } = req.query
  try {
    const semesters = await prisma.semester.findMany({
      where: sessionId ? { sessionId } : {},
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
      include: {
        session: { select: { id: true, name: true } },
        _count: { select: { sections: true, enrollments: true, assignments: true } },
      },
    })
    return res.json(semesters)
  } catch (err) {
    console.error('listSemesters error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/semesters/{id}:
 *   get:
 *     summary: Get a semester by ID
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Semester data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Semester'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getSemester = async (req, res) => {
  try {
    const semester = await prisma.semester.findUnique({
      where: { id: req.params.id },
      include: {
        session: { select: { id: true, name: true } },
        sections: {
          include: {
            course: { select: { id: true, title: true } },
            _count: { select: { enrollments: true } },
          },
        },
        _count: { select: { sections: true, enrollments: true, assignments: true } },
      },
    })
    if (!semester) return res.status(404).json({ error: 'Semester not found' })
    return res.json(semester)
  } catch (err) {
    console.error('getSemester error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/semesters:
 *   post:
 *     summary: Create a semester under a session (admin only)
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sessionId]
 *             properties:
 *               name:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               monthsIncluded:
 *                 type: string
 *                 example: "January, February, March"
 *               year:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Semester created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Semester'
 */
export const createSemester = async (req, res) => {
  const { name, sessionId, monthsIncluded, year } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Semester name is required' })
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required — a semester must belong to a session' })

  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId } })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const semester = await prisma.semester.create({
      data: {
        name: name.trim(),
        sessionId,
        monthsIncluded: monthsIncluded || null,
        year: year ? Number(year) : null,
      },
      include: { session: { select: { id: true, name: true } } },
    })
    return res.status(201).json(semester)
  } catch (err) {
    console.error('createSemester error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/semesters/{id}:
 *   put:
 *     summary: Update a semester (admin only)
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               monthsIncluded:
 *                 type: string
 *               year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated semester
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Semester'
 */
export const updateSemester = async (req, res) => {
  const { name, sessionId, monthsIncluded, year } = req.body
  try {
    const existing = await prisma.semester.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Semester not found' })

    if (sessionId) {
      const session = await prisma.session.findUnique({ where: { id: sessionId } })
      if (!session) return res.status(404).json({ error: 'Session not found' })
    }

    const semester = await prisma.semester.update({
      where: { id: req.params.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(monthsIncluded !== undefined ? { monthsIncluded: monthsIncluded || null } : {}),
        ...(year !== undefined ? { year: year ? Number(year) : null } : {}),
      },
      include: { session: { select: { id: true, name: true } } },
    })
    return res.json(semester)
  } catch (err) {
    console.error('updateSemester error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/semesters/{id}:
 *   delete:
 *     summary: Delete a semester (admin only)
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Semester deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export const deleteSemester = async (req, res) => {
  try {
    const existing = await prisma.semester.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Semester not found' })
    await prisma.semester.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Semester deleted successfully' })
  } catch (err) {
    console.error('deleteSemester error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
