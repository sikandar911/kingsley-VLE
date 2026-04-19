import prisma from '../../config/prisma.js'

/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Student enrollment and teacher assignment management
 */

// ============================================================================
// STUDENT ENROLLMENTS
// ============================================================================

/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: List student enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema: { type: string }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string }
 *       - in: query
 *         name: semesterId
 *         schema: { type: string }
 *       - in: query
 *         name: studentId
 *         schema: { type: string }
 *         description: StudentProfile.id
 *     responses:
 *       200:
 *         description: List of enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Enrollment'
 */
export const listEnrollments = async (req, res) => {
  const { courseId, sectionId, semesterId, studentId } = req.query
  const where = {}
  if (courseId) where.courseId = courseId
  if (sectionId) where.sectionId = sectionId
  if (semesterId) where.semesterId = semesterId
  if (studentId) where.studentId = studentId

  try {
    const enrollments = await prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            user: { select: { id: true, email: true } },
          },
        },
        course: { select: { id: true, title: true } },
        section: { select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true } },
        semester: { select: { id: true, name: true, year: true } },
      },
    })
    return res.json(enrollments)
  } catch (err) {
    console.error('listEnrollments error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: Enroll a student in a course / section / semester (admin only)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, courseId]
 *             properties:
 *               studentId:
 *                 type: string
 *                 description: StudentProfile.id
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Enrollment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       409:
 *         description: Already enrolled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createEnrollment = async (req, res) => {
  const { studentId, courseId, sectionId, semesterId } = req.body

  if (!studentId) return res.status(400).json({ error: 'studentId (StudentProfile.id) is required' })
  if (!courseId) return res.status(400).json({ error: 'courseId is required' })

  try {
    // Validate referenced records exist
    const [student, course] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { id: studentId } }),
      prisma.course.findUnique({ where: { id: courseId } }),
    ])
    if (!student) return res.status(404).json({ error: 'Student profile not found' })
    if (!course) return res.status(404).json({ error: 'Course not found' })

    if (sectionId) {
      const section = await prisma.section.findUnique({ where: { id: sectionId } })
      if (!section) return res.status(404).json({ error: 'Section not found' })
      if (section.courseId !== courseId)
        return res.status(400).json({ error: 'Section does not belong to the selected course' })
    }

    if (semesterId) {
      const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
      if (!semester) return res.status(404).json({ error: 'Semester not found' })
    }

    // Prevent duplicate enrollment (same student + course + section + semester)
    const existing = await prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId,
        sectionId: sectionId || null,
        semesterId: semesterId || null,
      },
    })
    if (existing) return res.status(409).json({ error: 'Student is already enrolled with these parameters' })

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId,
        sectionId: sectionId || null,
        semesterId: semesterId || null,
      },
      include: {
        student: { select: { id: true, fullName: true, studentId: true } },
        course: { select: { id: true, title: true } },
        section: { select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true } },
        semester: { select: { id: true, name: true, year: true } },
      },
    })

    // Update section student count if applicable
    if (sectionId) {
      await prisma.section.update({
        where: { id: sectionId },
        data: { totalStudentCount: { increment: 1 } },
      }).catch(() => {})
    }

    return res.status(201).json(enrollment)
  } catch (err) {
    console.error('createEnrollment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/enrollments/user/{userId}:
 *   get:
 *     summary: Get all enrollments for a specific user by their user UUID
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: User.id (UUID) — admin can query any user, student can only query their own
 *     responses:
 *       200:
 *         description: List of enrollments for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Enrollment'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Student profile not found for user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getEnrollmentsByUser = async (req, res) => {
  const { userId } = req.params

  // Students may only access their own enrollments
  if (req.user.role === 'student' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Forbidden: You can only view your own enrollments' })
  }

  try {
    const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } })
    if (!studentProfile) {
      return res.status(404).json({ error: 'No student profile found for this user' })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: studentProfile.id },
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            user: { select: { id: true, email: true } },
          },
        },
        course: { select: { id: true, title: true, description: true } },
        section: { select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true } },
        semester: { select: { id: true, name: true, year: true } },
      },
    })

    return res.json(enrollments)
  } catch (err) {
    console.error('getEnrollmentsByUser error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/enrollments/{id}:
 *   get:
 *     summary: Get an enrollment by ID
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Enrollment data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getEnrollment = async (req, res) => {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.id },
      include: {
        student: {
          select: { id: true, fullName: true, studentId: true, user: { select: { email: true } } },
        },
        course: { select: { id: true, title: true } },
        section: { select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true } },
        semester: { select: { id: true, name: true, year: true } },
      },
    })
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' })
    return res.json(enrollment)
  } catch (err) {
    console.error('getEnrollment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/enrollments/{id}:
 *   delete:
 *     summary: Remove a student enrollment (admin only)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Enrollment removed
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
export const deleteEnrollment = async (req, res) => {
  try {
    const existing = await prisma.enrollment.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Enrollment not found' })

    await prisma.enrollment.delete({ where: { id: req.params.id } })

    if (existing.sectionId) {
      await prisma.section.update({
        where: { id: existing.sectionId },
        data: { totalStudentCount: { decrement: 1 } },
      }).catch(() => {})
    }

    return res.json({ message: 'Enrollment removed successfully' })
  } catch (err) {
    console.error('deleteEnrollment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// ============================================================================
// TEACHER COURSE ASSIGNMENTS
// ============================================================================

/**
 * @swagger
 * /api/enrollments/teachers:
 *   get:
 *     summary: List teacher-course assignments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema: { type: string }
 *       - in: query
 *         name: teacherId
 *         schema: { type: string }
 *         description: TeacherProfile.id
 *     responses:
 *       200:
 *         description: List of teacher-course assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TeacherCourse'
 */
export const listTeacherCourses = async (req, res) => {
  const { courseId, teacherId, sectionId } = req.query
  const where = {}
  if (courseId) where.courseId = courseId
  if (teacherId) where.teacherId = teacherId
  if (sectionId) where.sectionId = sectionId

  try {
    const assignments = await prisma.teacherCourse.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            teacherId: true,
            fullName: true,
            specialization: true,
            user: { select: { id: true, email: true } },
          },
        },
        course: { select: { id: true, title: true } },
        section: { select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true } },
        semester: { select: { id: true, name: true, year: true } },
      },
    })
    return res.json(assignments)
  } catch (err) {
    console.error('listTeacherCourses error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/enrollments/teachers:
 *   post:
 *     summary: Assign a teacher to a course (admin only)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacherId, courseId]
 *             properties:
 *               teacherId:
 *                 type: string
 *                 description: TeacherProfile.id
 *               courseId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assignment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeacherCourse'
 *       409:
 *         description: Teacher already assigned to this course
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createTeacherCourse = async (req, res) => {
  const { teacherId, courseId, sectionId, semesterId } = req.body
  if (!teacherId || teacherId === "") return res.status(400).json({ error: 'teacherId (TeacherProfile.id) is required' })
  if (!courseId || courseId === "") return res.status(400).json({ error: 'courseId is required' })
  if (!semesterId || semesterId === "") return res.status(400).json({ error: 'semesterId is required' })

  try {
    const [teacher, course] = await Promise.all([
      prisma.teacherProfile.findUnique({ where: { id: teacherId } }),
      prisma.course.findUnique({ where: { id: courseId } }),
    ])
    if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' })
    if (!course) return res.status(404).json({ error: 'Course not found' })

    if (sectionId) {
      const section = await prisma.section.findUnique({ where: { id: sectionId } })
      if (!section) return res.status(404).json({ error: 'Section not found' })
      if (section.courseId !== courseId)
        return res.status(400).json({ error: 'Section does not belong to the selected course' })
    }

    if (semesterId) {
      const semester = await prisma.semester.findUnique({ where: { id: semesterId } })
      if (!semester) return res.status(404).json({ error: 'Semester not found' })
    }

    const existing = await prisma.teacherCourse.findFirst({
      where: { teacherId, courseId, sectionId: sectionId || null, semesterId: semesterId || null },
    })
    if (existing) return res.status(409).json({ error: 'Teacher is already assigned to this course/section/semester' })

    const assignment = await prisma.teacherCourse.create({
      data: { teacherId, courseId, sectionId: sectionId || null, semesterId: semesterId || null },
      include: {
        teacher: { select: { id: true, fullName: true, teacherId: true } },
        course: { select: { id: true, title: true } },
        section: { select: { id: true, name: true, daysOfWeek: true, startTime: true, endTime: true } },
        semester: { select: { id: true, name: true, year: true } },
      },
    })
    return res.status(201).json(assignment)
  } catch (err) {
    console.error('createTeacherCourse error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/enrollments/teachers/{id}:
 *   delete:
 *     summary: Remove a teacher from a course (admin only)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: TeacherCourse.id
 *     responses:
 *       200:
 *         description: Assignment removed
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
export const deleteTeacherCourse = async (req, res) => {
  try {
    const existing = await prisma.teacherCourse.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Teacher-course assignment not found' })

    await prisma.teacherCourse.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Teacher assignment removed successfully' })
  } catch (err) {
    console.error('deleteTeacherCourse error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
