import prisma from '../../config/prisma.js'

const assignmentBaseInclude = {
  course: true,
  section: true,
  semester: true,
  teacher: {
    select: {
      id: true,
      teacherId: true,
      fullName: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
  assignmentFiles: {
    include: {
      file: true,
    },
  },
  rubrics: true,
}

const submissionInclude = {
  student: {
    select: {
      id: true,
      studentId: true,
      fullName: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
  submissionFile: true,
  markedByTeacher: {
    select: {
      id: true,
      teacherId: true,
      fullName: true,
    },
  },
}

const parseDate = (value) => (value ? new Date(value) : null)

const normalizeRubrics = (rubrics) => {
  if (!Array.isArray(rubrics)) return []

  return rubrics
    .filter((item) => item && item.criteria)
    .map((item) => ({
      criteria: String(item.criteria).trim(),
      maxMarks: Number(item.maxMarks),
    }))
    .filter((item) => item.criteria && Number.isFinite(item.maxMarks) && item.maxMarks > 0)
}

const getTeacherProfileByUserId = (userId) => prisma.teacherProfile.findUnique({ where: { userId } })

const getStudentProfileByUserId = (userId) => prisma.studentProfile.findUnique({ where: { userId } })

const ensureTeacherCanManageCourse = async (teacherProfileId, courseId, sectionId) => {
  const [teacherCourse, section] = await Promise.all([
    prisma.teacherCourse.findFirst({
      where: {
        teacherId: teacherProfileId,
        courseId,
      },
    }),
    sectionId
      ? prisma.section.findUnique({
          where: { id: sectionId },
          select: { id: true, courseId: true, assignedTeacherId: true },
        })
      : Promise.resolve(null),
  ])

  if (section && section.courseId !== courseId) {
    return { ok: false, error: 'Section does not belong to the selected course' }
  }

  const canManage = Boolean(teacherCourse) || Boolean(section?.assignedTeacherId === teacherProfileId)
  if (!canManage) {
    return { ok: false, error: 'Teacher is not assigned to the selected course or section' }
  }

  return { ok: true }
}

const buildAssignmentPayload = ({ body, teacherId, keepStatus = true }) => {
  const rubrics = normalizeRubrics(body.rubrics)
  const assignmentFileIds = Array.isArray(body.assignmentFileIds) ? body.assignmentFileIds : []

  const data = {
    title: body.title,
    description: body.description || null,
    teacherInstruction: body.instructions || body.teacherInstruction || null,
    teacherId,
    dueDate: parseDate(body.dueDate),
    totalMarks: body.totalMarks !== undefined ? Number(body.totalMarks) : 100,
    passingMarks: body.passingMarks !== undefined && body.passingMarks !== null ? Number(body.passingMarks) : null,
    allowLateSubmission: Boolean(body.allowLateSubmission),
    targetType: body.targetType || (body.sectionId ? 'section' : 'individual'),
    courseId: body.courseId,
    sectionId: body.sectionId || null,
    semesterId: body.semesterId || null,
  }

  if (keepStatus) {
    data.status = body.status || 'draft'
  }

  if (rubrics.length) {
    data.rubrics = {
      create: rubrics,
    }
  }

  if (assignmentFileIds.length) {
    data.assignmentFiles = {
      create: assignmentFileIds.map((fileId) => ({ fileId })),
    }
  }

  return data
}

const validateAssignmentPayload = async (body, { requireTeacherId }) => {
  if (!body.title || !body.courseId) {
    return 'title and courseId are required'
  }

  if (!body.semesterId) {
    return 'semesterId is required'
  }

  if (!body.sectionId) {
    return 'sectionId is required'
  }

  const totalMarks = body.totalMarks !== undefined ? Number(body.totalMarks) : 100
  const passingMarks = body.passingMarks !== undefined && body.passingMarks !== null ? Number(body.passingMarks) : null

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    return 'totalMarks must be a positive number'
  }

  if (passingMarks !== null && (!Number.isFinite(passingMarks) || passingMarks < 0 || passingMarks > totalMarks)) {
    return 'passingMarks must be between 0 and totalMarks'
  }

  if (requireTeacherId && !body.teacherId) {
    return 'teacherId is required'
  }

  if (body.status && !['draft', 'published', 'closed'].includes(body.status)) {
    return 'status must be draft, published, or closed'
  }

  if (body.targetType && !['section', 'individual'].includes(body.targetType)) {
    return 'targetType must be section or individual'
  }

  if (body.sectionId) {
    const section = await prisma.section.findUnique({ where: { id: body.sectionId } })
    if (!section) return 'Selected section was not found'
    if (section.courseId !== body.courseId) return 'sectionId does not belong to the selected course'
  }

  return null
}

const getStudentEnrollmentScope = async (studentProfileId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: studentProfileId },
    select: {
      courseId: true,
      sectionId: true,
      semesterId: true,
    },
  })

  const courseIds = [...new Set(enrollments.map((item) => item.courseId).filter(Boolean))]
  const sectionIds = [...new Set(enrollments.map((item) => item.sectionId).filter(Boolean))]
  const semesterIds = [...new Set(enrollments.map((item) => item.semesterId).filter(Boolean))]

  return { enrollments, courseIds, sectionIds, semesterIds }
}

const buildStudentAssignmentWhere = ({ id, courseIds, sectionIds, semesterIds }) => {
  const filters = [
    { status: 'published' },
    { courseId: { in: courseIds } },
    {
      OR: [{ sectionId: null }, ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : [])],
    },
    {
      OR: [{ semesterId: null }, ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : [])],
    },
  ]

  if (id) {
    filters.unshift({ id })
  }

  return { AND: filters }
}

const getTeacherManagedAssignmentWhere = async (userId, extraWhere = {}) => {
  const teacherProfile = await getTeacherProfileByUserId(userId)
  if (!teacherProfile) {
    return { teacherProfile: null, where: null }
  }

  return {
    teacherProfile,
    where: {
      teacherId: teacherProfile.id,
      ...extraWhere,
    },
  }
}

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create an assignment with optional rubric criteria and attachments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, courseId]
 *             properties:
 *               teacherId:
 *                 type: string
 *                 description: Required for admin users; ignored for teacher users
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               totalMarks:
 *                 type: integer
 *               passingMarks:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               allowLateSubmission:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published, closed]
 *               targetType:
 *                 type: string
 *                 enum: [section, individual]
 *               assignmentFileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               rubrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     criteria:
 *                       type: string
 *                     maxMarks:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Assignment created successfully
 */
export const createAssignment = async (req, res) => {
  try {
    const validationError = await validateAssignmentPayload(req.body, { requireTeacherId: req.user.role === 'admin' })
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    let teacherId = req.body.teacherId

    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id)
      if (!teacherProfile) {
        return res.status(400).json({ error: 'Teacher profile not found' })
      }

      const permission = await ensureTeacherCanManageCourse(teacherProfile.id, req.body.courseId, req.body.sectionId)
      if (!permission.ok) {
        return res.status(403).json({ error: permission.error })
      }

      teacherId = teacherProfile.id
    } else {
      const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id: teacherId } })
      if (!teacherProfile) {
        return res.status(400).json({ error: 'Selected teacherId was not found' })
      }
    }

    const assignmentFileIds = Array.isArray(req.body.assignmentFileIds) ? req.body.assignmentFileIds : []
    if (assignmentFileIds.length) {
      const fileCount = await prisma.file.count({ where: { id: { in: assignmentFileIds } } })
      if (fileCount !== assignmentFileIds.length) {
        return res.status(400).json({ error: 'One or more assignmentFileIds are invalid' })
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        ...buildAssignmentPayload({ body: req.body, teacherId }),
        createdBy: req.user.id,
      },
      include: {
        ...assignmentBaseInclude,
      },
    })

    return res.status(201).json(assignment)
  } catch (err) {
    console.error('Create assignment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: List assignments for the current user
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, closed]
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment list
 */
export const listAssignments = async (req, res) => {
  try {
    const filters = {}
    if (req.query.status) filters.status = req.query.status
    if (req.query.courseId) filters.courseId = req.query.courseId
    if (req.query.sectionId) filters.sectionId = req.query.sectionId

    let where = filters

    if (req.user.role === 'teacher') {
      const scoped = await getTeacherManagedAssignmentWhere(req.user.id, filters)
      if (!scoped.teacherProfile) {
        return res.status(400).json({ error: 'Teacher profile not found' })
      }
      where = scoped.where
    }

    if (req.user.role === 'student') {
      const studentProfile = await getStudentProfileByUserId(req.user.id)
      if (!studentProfile) {
        return res.status(400).json({ error: 'Student profile not found' })
      }

      const { courseIds, sectionIds, semesterIds } = await getStudentEnrollmentScope(studentProfile.id)
      if (!courseIds.length) {
        return res.json([])
      }

      where = buildStudentAssignmentWhere({
        courseIds,
        sectionIds,
        semesterIds,
      })
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        ...assignmentBaseInclude,
        _count: {
          select: {
            submissions: true,
          },
        },
        submissions: req.user.role === 'student'
          ? {
              where: {
                student: {
                  userId: req.user.id,
                },
                deletedAt: null,
              },
              orderBy: { attemptNumber: 'desc' },
              take: 1,
              include: submissionInclude,
            }
          : false,
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })

    return res.json(assignments)
  } catch (err) {
    console.error('List assignments error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get assignment details
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment details
 *       404:
 *         description: Assignment not found
 */
export const getAssignmentById = async (req, res) => {
  try {
    let assignment = null

    if (req.user.role === 'student') {
      const studentProfile = await getStudentProfileByUserId(req.user.id)
      if (!studentProfile) {
        return res.status(400).json({ error: 'Student profile not found' })
      }

      const { courseIds, sectionIds, semesterIds } = await getStudentEnrollmentScope(studentProfile.id)
      if (!courseIds.length) {
        return res.status(404).json({ error: 'Assignment not found' })
      }

      assignment = await prisma.assignment.findFirst({
        where: buildStudentAssignmentWhere({
          id: req.params.id,
          courseIds,
          sectionIds,
          semesterIds,
        }),
        include: {
          ...assignmentBaseInclude,
          submissions: {
            where: {
              studentId: studentProfile.id,
              deletedAt: null,
            },
            orderBy: { attemptNumber: 'desc' },
            include: submissionInclude,
          },
        },
      })
    } else if (req.user.role === 'teacher') {
      const scoped = await getTeacherManagedAssignmentWhere(req.user.id, { id: req.params.id })
      if (!scoped.teacherProfile) {
        return res.status(400).json({ error: 'Teacher profile not found' })
      }

      assignment = await prisma.assignment.findFirst({
        where: scoped.where,
        include: {
          ...assignmentBaseInclude,
          submissions: {
            where: { deletedAt: null },
            orderBy: [{ submittedAt: 'desc' }, { attemptNumber: 'desc' }],
            include: submissionInclude,
          },
        },
      })
    } else {
      assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id },
        include: {
          ...assignmentBaseInclude,
          submissions: {
            where: { deletedAt: null },
            orderBy: [{ submittedAt: 'desc' }, { attemptNumber: 'desc' }],
            include: submissionInclude,
          },
        },
      })
    }

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    return res.json(assignment)
  } catch (err) {
    console.error('Get assignment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments/{id}:
 *   put:
 *     summary: Update an assignment and replace rubric criteria when provided
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated assignment
 */
export const updateAssignment = async (req, res) => {
  try {
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { rubrics: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    let teacherId = existing.teacherId

    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id)
      if (!teacherProfile) {
        return res.status(400).json({ error: 'Teacher profile not found' })
      }
      if (existing.teacherId !== teacherProfile.id) {
        return res.status(403).json({ error: 'You can only update your own assignments' })
      }

      const courseId = req.body.courseId || existing.courseId
      const sectionId = req.body.sectionId !== undefined ? req.body.sectionId : existing.sectionId
      const permission = await ensureTeacherCanManageCourse(teacherProfile.id, courseId, sectionId)
      if (!permission.ok) {
        return res.status(403).json({ error: permission.error })
      }
    } else if (req.body.teacherId && req.body.teacherId !== existing.teacherId) {
      const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id: req.body.teacherId } })
      if (!teacherProfile) {
        return res.status(400).json({ error: 'Selected teacherId was not found' })
      }
      teacherId = teacherProfile.id
    }

    const mergedPayload = {
      ...existing,
      ...req.body,
      courseId: req.body.courseId || existing.courseId,
      sectionId: req.body.sectionId !== undefined ? req.body.sectionId : existing.sectionId,
      semesterId: req.body.semesterId !== undefined ? req.body.semesterId : existing.semesterId,
      totalMarks: req.body.totalMarks !== undefined ? req.body.totalMarks : existing.totalMarks,
      passingMarks: req.body.passingMarks !== undefined ? req.body.passingMarks : existing.passingMarks,
      status: req.body.status || existing.status,
      targetType: req.body.targetType || existing.targetType,
    }

    const validationError = await validateAssignmentPayload(mergedPayload, { requireTeacherId: false })
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const assignmentFileIds = Array.isArray(req.body.assignmentFileIds) ? req.body.assignmentFileIds : null
    if (assignmentFileIds?.length) {
      const fileCount = await prisma.file.count({ where: { id: { in: assignmentFileIds } } })
      if (fileCount !== assignmentFileIds.length) {
        return res.status(400).json({ error: 'One or more assignmentFileIds are invalid' })
      }
    }

    const updateData = {
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      teacherInstruction: req.body.instructions ?? req.body.teacherInstruction ?? existing.teacherInstruction,
      teacherId,
      dueDate: req.body.dueDate !== undefined ? parseDate(req.body.dueDate) : existing.dueDate,
      totalMarks: req.body.totalMarks !== undefined ? Number(req.body.totalMarks) : existing.totalMarks,
      passingMarks:
        req.body.passingMarks !== undefined
          ? req.body.passingMarks === null
            ? null
            : Number(req.body.passingMarks)
          : existing.passingMarks,
      allowLateSubmission:
        req.body.allowLateSubmission !== undefined
          ? Boolean(req.body.allowLateSubmission)
          : existing.allowLateSubmission,
      status: req.body.status || existing.status,
      targetType: req.body.targetType || existing.targetType,
      courseId: req.body.courseId || existing.courseId,
      sectionId: req.body.sectionId !== undefined ? req.body.sectionId : existing.sectionId,
      semesterId: req.body.semesterId !== undefined ? req.body.semesterId : existing.semesterId,
    }

    if (Array.isArray(req.body.rubrics)) {
      const rubrics = normalizeRubrics(req.body.rubrics)
      updateData.rubrics = {
        deleteMany: {},
        create: rubrics,
      }
    }

    if (assignmentFileIds) {
      updateData.assignmentFiles = {
        deleteMany: {},
        create: assignmentFileIds.map((fileId) => ({ fileId })),
      }
    }

    const updated = await prisma.assignment.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        ...assignmentBaseInclude,
      },
    })

    return res.json(updated)
  } catch (err) {
    console.error('Update assignment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments/{id}/status:
 *   patch:
 *     summary: Update assignment publication status
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, published, closed]
 *     responses:
 *       200:
 *         description: Assignment status updated
 */
export const updateAssignmentStatus = async (req, res) => {
  const { status } = req.body
  if (!['draft', 'published', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'status must be draft, published, or closed' })
  }

  try {
    const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } })
    if (!existing) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id)
      if (!teacherProfile || teacherProfile.id !== existing.teacherId) {
        return res.status(403).json({ error: 'You can only update your own assignments' })
      }
    }

    const updated = await prisma.assignment.update({
      where: { id: req.params.id },
      data: { status },
      include: assignmentBaseInclude,
    })

    return res.json(updated)
  } catch (err) {
    console.error('Update assignment status error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   post:
 *     summary: Submit or resubmit an assignment as a student
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               submissionText:
 *                 type: string
 *               submissionFileId:
 *                 type: string
 *               submissionFileUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Submission created
 */
export const submitAssignment = async (req, res) => {
  const { submissionText, submissionFileId, submissionFileUrl } = req.body

  if (!submissionText && !submissionFileId && !submissionFileUrl) {
    return res.status(400).json({ error: 'Provide submissionText, submissionFileId, or submissionFileUrl' })
  }

  try {
    const studentProfile = await getStudentProfileByUserId(req.user.id)
    if (!studentProfile) {
      return res.status(400).json({ error: 'Student profile not found' })
    }

    const { courseIds, sectionIds, semesterIds } = await getStudentEnrollmentScope(studentProfile.id)
    if (!courseIds.length) {
      return res.status(403).json({ error: 'You are not enrolled in any course' })
    }

    const assignment = await prisma.assignment.findFirst({
      where: buildStudentAssignmentWhere({
        id: req.params.id,
        courseIds,
        sectionIds,
        semesterIds,
      }),
    })

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    if (assignment.status !== 'published') {
      return res.status(400).json({ error: 'Only published assignments can receive submissions' })
    }

    const now = new Date()
    const isLate = Boolean(assignment.dueDate && now > assignment.dueDate)
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({ error: 'Late submission is not allowed for this assignment' })
    }

    if (submissionFileId) {
      const file = await prisma.file.findUnique({ where: { id: submissionFileId } })
      if (!file) {
        return res.status(400).json({ error: 'submissionFileId is invalid' })
      }
    }

    const latestAttempt = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId: assignment.id,
        studentId: studentProfile.id,
      },
      orderBy: { attemptNumber: 'desc' },
      select: { attemptNumber: true },
    })

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: assignment.id,
        studentId: studentProfile.id,
        submissionText: submissionText || null,
        submissionFileId: submissionFileId || null,
        submissionFileUrl: submissionFileUrl || null,
        status: isLate ? 'late' : 'submitted',
        attemptNumber: (latestAttempt?.attemptNumber || 0) + 1,
      },
      include: submissionInclude,
    })

    return res.status(201).json(submission)
  } catch (err) {
    console.error('Submit assignment error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   get:
 *     summary: List submissions for an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission list
 */
export const listAssignmentSubmissions = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } })
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id)
      if (!teacherProfile || teacherProfile.id !== assignment.teacherId) {
        return res.status(403).json({ error: 'You can only view submissions for your own assignments' })
      }
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: req.params.id,
        deletedAt: null,
      },
      include: submissionInclude,
      orderBy: [{ submittedAt: 'desc' }, { attemptNumber: 'desc' }],
    })

    return res.json(submissions)
  } catch (err) {
    console.error('List assignment submissions error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments/submissions/{submissionId}/grade:
 *   patch:
 *     summary: Grade a submission inside the submission record
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marks:
 *                 type: integer
 *               gradeLetter:
 *                 type: string
 *               feedback:
 *                 type: string
 *               markedByTeacherId:
 *                 type: string
 *                 description: Required only if an admin is grading on behalf of a teacher
 *     responses:
 *       200:
 *         description: Submission graded successfully
 */
export const gradeSubmission = async (req, res) => {
  const { marks, gradeLetter, feedback, markedByTeacherId } = req.body

  if (marks === undefined && gradeLetter === undefined && feedback === undefined) {
    return res.status(400).json({ error: 'Provide marks, gradeLetter, or feedback to update grading' })
  }

  try {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: req.params.submissionId },
      include: {
        assignment: true,
      },
    })

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    let graderTeacherId = markedByTeacherId || null

    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id)
      if (!teacherProfile || teacherProfile.id !== submission.assignment.teacherId) {
        return res.status(403).json({ error: 'You can only grade submissions for your own assignments' })
      }
      graderTeacherId = teacherProfile.id
    } else {
      if (!graderTeacherId) {
        return res.status(400).json({ error: 'markedByTeacherId is required when grading as admin' })
      }
      const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id: graderTeacherId } })
      if (!teacherProfile) {
        return res.status(400).json({ error: 'markedByTeacherId is invalid' })
      }
    }

    if (marks !== undefined) {
      const numericMarks = Number(marks)
      if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > submission.assignment.totalMarks) {
        return res.status(400).json({ error: `marks must be between 0 and ${submission.assignment.totalMarks}` })
      }
    }

    const graded = await prisma.assignmentSubmission.update({
      where: { id: req.params.submissionId },
      data: {
        marks: marks !== undefined ? Number(marks) : submission.marks,
        gradeLetter: gradeLetter !== undefined ? gradeLetter : submission.gradeLetter,
        feedback: feedback !== undefined ? feedback : submission.feedback,
        markedBy: graderTeacherId,
        markedAt: new Date(),
      },
      include: {
        ...submissionInclude,
        assignment: {
          include: assignmentBaseInclude,
        },
      },
    })

    return res.json(graded)
  } catch (err) {
    console.error('Grade submission error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/assignments/meta:
 *   get:
 *     summary: Get courses (with sections) and teachers for the assignment creation form
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses with sections, and teachers array (admin only)
 */
export const getAssignmentsMeta = async (req, res) => {
  try {
    let courseWhere = {}

    if (req.user.role === 'teacher') {
      const teacherProfile = await prisma.teacherProfile.findUnique({ where: { userId: req.user.id } })
      if (!teacherProfile) return res.status(400).json({ error: 'Teacher profile not found' })

      const teacherCourses = await prisma.teacherCourse.findMany({
        where: { teacherId: teacherProfile.id },
        select: { courseId: true },
      })
      const courseIds = teacherCourses.map((tc) => tc.courseId)
      courseWhere = courseIds.length ? { id: { in: courseIds } } : { id: { in: [] } }
    }

    const courses = await prisma.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        semesterId: true,
        semester: { select: { id: true, name: true, year: true } },
        sections: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    })

    const result = { courses }

    if (req.user.role === 'admin') {
      const teachers = await prisma.teacherProfile.findMany({
        select: {
          id: true,
          teacherId: true,
          fullName: true,
          user: { select: { email: true } },
        },
        orderBy: { fullName: 'asc' },
      })
      result.teachers = teachers
    }

    return res.json(result)
  } catch (err) {
    console.error('Assignment meta error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}