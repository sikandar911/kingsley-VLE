import prisma from '../../config/prisma.js'
import { deleteFromAzure } from '../../config/azure.storage.js'

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseListResponse'
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
            select: { id: true, name: true, totalStudentCount: true },
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
    return res.json({
      data: courses,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    })
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
export const deleteCourse = async (req, res) => {
  try {
    const existing = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Course not found' })

    // Clean up class materials: delete Azure blobs + File records before course delete
    const materials = await prisma.classMaterial.findMany({
      where: { courseId: req.params.id },
      include: { file: true },
    })
    for (const material of materials) {
      if (material.file?.slug) await deleteFromAzure(material.file.slug)
    }
    const fileIds = materials.map((m) => m.fileId).filter(Boolean)
    if (fileIds.length > 0) {
      // Unlink before delete to avoid FK constraint on classMaterial
      await prisma.classMaterial.deleteMany({ where: { courseId: req.params.id } })
      await prisma.file.deleteMany({ where: { id: { in: fileIds } } })
    }

    // Delete the course — ClassRecords cascade via onDelete:Cascade in schema
    await prisma.course.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Course deleted successfully' })
  } catch (err) {
    console.error('deleteCourse error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
