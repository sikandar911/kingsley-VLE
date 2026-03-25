import prisma from '../../config/prisma.js'

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management endpoints
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: List all courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title or description
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of courses
 */
export const listCourses = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {}

  try {
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          semester: { select: { id: true, name: true, year: true } },
          sections: {
            select: { id: true, name: true, totalStudentCount: true, assignedTeacherId: true },
          },
          teacherAssignments: {
            include: {
              teacher: { select: { id: true, fullName: true, teacherId: true } },
            },
          },
          _count: { select: { enrollments: true, assignments: true, sections: true } },
        },
      }),
      prisma.course.count({ where }),
    ])
    return res.json({ courses, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('listCourses error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get a course by ID
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Course data
 *       404:
 *         description: Not found
 */
export const getCourse = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        semester: { select: { id: true, name: true, year: true, session: { select: { id: true, name: true } } } },
        sections: {
          include: {
            assignedTeacher: { select: { id: true, fullName: true, teacherId: true } },
            semester: { select: { id: true, name: true } },
            _count: { select: { enrollments: true } },
          },
        },
        teacherAssignments: {
          include: {
            teacher: { select: { id: true, fullName: true, teacherId: true, user: { select: { email: true } } } },
          },
        },
        _count: { select: { enrollments: true, assignments: true, sections: true } },
      },
    })
    if (!course) return res.status(404).json({ error: 'Course not found' })
    return res.json(course)
  } catch (err) {
    console.error('getCourse error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Course created
 *       400:
 *         description: Validation error
 */
export const createCourse = async (req, res) => {
  const { title, description, semesterId } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Course title is required' })
  if (!semesterId) return res.status(400).json({ error: 'semesterId is required' })

  try {
    const semesterExists = await prisma.semester.findUnique({ where: { id: semesterId } })
    if (!semesterExists) return res.status(400).json({ error: 'Selected semester not found' })

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: description || null,
        semesterId,
        createdBy: req.user.id,
      },
    })
    return res.status(201).json(course)
  } catch (err) {
    console.error('createCourse error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course (admin only)
 *     tags: [Courses]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated course
 *       404:
 *         description: Not found
 */
export const updateCourse = async (req, res) => {
  const { title, description, semesterId } = req.body
  try {
    const existing = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Course not found' })

    if (semesterId) {
      const semesterExists = await prisma.semester.findUnique({ where: { id: semesterId } })
      if (!semesterExists) return res.status(400).json({ error: 'Selected semester not found' })
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(semesterId !== undefined ? { semesterId: semesterId || null } : {}),
      },
    })
    return res.json(course)
  } catch (err) {
    console.error('updateCourse error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete a course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Course deleted
 *       404:
 *         description: Not found
 */
export const deleteCourse = async (req, res) => {
  try {
    const existing = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Course not found' })

    await prisma.course.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Course deleted successfully' })
  } catch (err) {
    console.error('deleteCourse error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
