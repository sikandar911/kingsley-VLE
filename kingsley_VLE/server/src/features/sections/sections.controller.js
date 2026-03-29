import prisma from '../../config/prisma.js'

/**
 * @swagger
 * tags:
 *   name: Sections
 *   description: Section management (requires a course)
 */

/**
 * @swagger
 * /api/sections:
 *   get:
 *     summary: List sections, optionally filtered by course
 *     tags: [Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema: { type: string }
 *         description: Filter by course ID
 *       - in: query
 *         name: semesterId
 *         schema: { type: string }
 *         description: Filter by semester ID
 *     responses:
 *       200:
 *         description: List of sections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Section'
 */
export const listSections = async (req, res) => {
  const { courseId, semesterId } = req.query
  const where = {}
  if (courseId) where.courseId = courseId
  if (semesterId) where.semesterId = semesterId

  try {
    const sections = await prisma.section.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
        semester: { select: { id: true, name: true, year: true } },
        assignedTeacher: { select: { id: true, fullName: true, teacherId: true } },
        _count: { select: { enrollments: true, assignments: true } },
      },
    })
    return res.json(sections)
  } catch (err) {
    console.error('listSections error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sections/{id}:
 *   get:
 *     summary: Get a section by ID
 *     tags: [Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Section data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Section'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getSection = async (req, res) => {
  try {
    const section = await prisma.section.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { id: true, title: true } },
        semester: { select: { id: true, name: true, year: true } },
        assignedTeacher: { select: { id: true, fullName: true, teacherId: true } },
        enrollments: {
          include: {
            student: { select: { id: true, fullName: true, studentId: true } },
          },
        },
        _count: { select: { enrollments: true, assignments: true } },
      },
    })
    if (!section) return res.status(404).json({ error: 'Section not found' })
    return res.json(section)
  } catch (err) {
    console.error('getSection error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sections:
 *   post:
 *     summary: Create a section under a course (admin only)
 *     tags: [Sections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, courseId]
 *             properties:
 *               name:
 *                 type: string
 *               courseId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               assignedTeacherId:
 *                 type: string
 *                 description: TeacherProfile.id
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Section created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Section'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Course or semester not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createSection = async (req, res) => {
  const { name, courseId, semesterId, assignedTeacherId, description } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Section name is required' })
  if (!courseId) return res.status(400).json({ error: 'courseId is required — a section must belong to a course' })

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return res.status(404).json({ error: 'Course not found' })

    if (semesterId) {
      const sem = await prisma.semester.findUnique({ where: { id: semesterId } })
      if (!sem) return res.status(404).json({ error: 'Semester not found' })
    }

    if (assignedTeacherId) {
      const teacher = await prisma.teacherProfile.findUnique({ where: { id: assignedTeacherId } })
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' })
    }

    const section = await prisma.section.create({
      data: {
        name: name.trim(),
        courseId,
        semesterId: semesterId || null,
        assignedTeacherId: assignedTeacherId || null,
        description: description || null,
      },
      include: {
        course: { select: { id: true, title: true } },
        semester: { select: { id: true, name: true } },
        assignedTeacher: { select: { id: true, fullName: true, teacherId: true } },
      },
    })

    // Update course totalSectionCount
    await prisma.course.update({
      where: { id: courseId },
      data: { totalSectionCount: { increment: 1 } },
    })

    return res.status(201).json(section)
  } catch (err) {
    console.error('createSection error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sections/{id}:
 *   put:
 *     summary: Update a section (admin only)
 *     tags: [Sections]
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
 *               semesterId:
 *                 type: string
 *               assignedTeacherId:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated section
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Section'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateSection = async (req, res) => {
  const { name, semesterId, assignedTeacherId, description } = req.body
  try {
    const existing = await prisma.section.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Section not found' })

    if (semesterId) {
      const sem = await prisma.semester.findUnique({ where: { id: semesterId } })
      if (!sem) return res.status(404).json({ error: 'Semester not found' })
    }

    if (assignedTeacherId) {
      const teacher = await prisma.teacherProfile.findUnique({ where: { id: assignedTeacherId } })
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' })
    }

    const section = await prisma.section.update({
      where: { id: req.params.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(semesterId !== undefined ? { semesterId: semesterId || null } : {}),
        ...(assignedTeacherId !== undefined ? { assignedTeacherId: assignedTeacherId || null } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        semester: { select: { id: true, name: true } },
        assignedTeacher: { select: { id: true, fullName: true, teacherId: true } },
      },
    })
    return res.json(section)
  } catch (err) {
    console.error('updateSection error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/sections/{id}:
 *   delete:
 *     summary: Delete a section (admin only)
 *     tags: [Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Section deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const deleteSection = async (req, res) => {
  try {
    const existing = await prisma.section.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Section not found' })

    await prisma.section.delete({ where: { id: req.params.id } })

    // Update course totalSectionCount
    await prisma.course.update({
      where: { id: existing.courseId },
      data: { totalSectionCount: { decrement: 1 } },
    }).catch(() => {}) // non-fatal

    return res.json({ message: 'Section deleted successfully' })
  } catch (err) {
    console.error('deleteSection error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
