import prisma from '../../config/prisma.js'

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Student attendance management
 */

const attendanceInclude = {
  student: { select: { id: true, studentId: true, fullName: true } },
  section: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true, year: true } },
}

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: List attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema: { type: string }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string }
 *       - in: query
 *         name: semesterId
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Exact date (YYYY-MM-DD)
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [present, absent, late, excused]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: List of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceListResponse'
 */
export const listAttendance = async (req, res) => {
  const { studentId, sectionId, semesterId, date, from, to, status, page = 1, limit = 50 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {}
  if (sectionId) where.sectionId = sectionId
  if (semesterId) where.semesterId = semesterId
  if (status) where.status = status

  // Students can only see their own attendance
  if (req.user.role === 'student') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } })
    if (!profile) return res.status(404).json({ error: 'Student profile not found' })
    where.studentId = profile.id
  } else if (studentId) {
    where.studentId = studentId
  }

  if (date) {
    const d = new Date(date)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.date = { gte: d, lt: next }
  } else if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to)
  }

  try {
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: attendanceInclude,
      }),
      prisma.attendance.count({ where }),
    ])
    return res.json({ records, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('listAttendance error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/attendance/{id}:
 *   get:
 *     summary: Get an attendance record by ID
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Attendance record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecord'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAttendance = async (req, res) => {
  try {
    const record = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      include: attendanceInclude,
    })
    if (!record) return res.status(404).json({ error: 'Attendance record not found' })

    // Students can only view their own
    if (req.user.role === 'student') {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } })
      if (!profile || record.studentId !== profile.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    return res.json(record)
  } catch (err) {
    console.error('getAttendance error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/attendance:
 *   post:
 *     summary: Mark attendance for a single student
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, sectionId, semesterId, date, status]
 *             properties:
 *               studentId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [present, absent, late, excused]
 *     responses:
 *       201:
 *         description: Attendance marked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecord'
 *       400:
 *         description: Validation error or duplicate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const markAttendance = async (req, res) => {
  const { studentId, sectionId, semesterId, date, status } = req.body

  if (!studentId || !sectionId || !semesterId || !date || !status) {
    return res.status(400).json({ error: 'studentId, sectionId, semesterId, date and status are required' })
  }

  const validStatuses = ['present', 'absent', 'late', 'excused']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
  }

  try {
    const attendanceDate = new Date(date)
    if (isNaN(attendanceDate.getTime())) return res.status(400).json({ error: 'Invalid date' })
    // Normalize to midnight UTC
    attendanceDate.setUTCHours(0, 0, 0, 0)

    const existing = await prisma.attendance.findFirst({
      where: { studentId, sectionId, date: attendanceDate },
    })
    if (existing) {
      return res.status(400).json({ error: 'Attendance already marked for this student on this date in this section' })
    }

    const record = await prisma.attendance.create({
      data: { studentId, sectionId, semesterId, date: attendanceDate, status },
      include: attendanceInclude,
    })
    return res.status(201).json(record)
  } catch (err) {
    console.error('markAttendance error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/attendance/bulk:
 *   post:
 *     summary: Mark attendance for multiple students at once
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sectionId, semesterId, date, records]
 *             properties:
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [studentId, status]
 *                   properties:
 *                     studentId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [present, absent, late, excused]
 *     responses:
 *       201:
 *         description: Attendance records created/updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkAttendanceResponse'
 */
export const markBulkAttendance = async (req, res) => {
  const { sectionId, semesterId, date, records } = req.body

  if (!sectionId || !semesterId || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'sectionId, semesterId, date and records[] are required' })
  }

  const validStatuses = ['present', 'absent', 'late', 'excused']
  for (const r of records) {
    if (!r.studentId || !validStatuses.includes(r.status)) {
      return res.status(400).json({ error: 'Each record must have studentId and valid status' })
    }
  }

  try {
    const attendanceDate = new Date(date)
    if (isNaN(attendanceDate.getTime())) return res.status(400).json({ error: 'Invalid date' })
    attendanceDate.setUTCHours(0, 0, 0, 0)

    // Upsert pattern: delete existing for this section+date, then insert fresh
    await prisma.attendance.deleteMany({ where: { sectionId, date: attendanceDate } })

    const created = await prisma.attendance.createMany({
      data: records.map((r) => ({
        studentId: r.studentId,
        sectionId,
        semesterId,
        date: attendanceDate,
        status: r.status,
      })),
    })

    return res.status(201).json({ message: `${created.count} attendance records saved`, date: attendanceDate, sectionId })
  } catch (err) {
    console.error('markBulkAttendance error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/attendance/{id}:
 *   put:
 *     summary: Update an attendance record status
 *     tags: [Attendance]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [present, absent, late, excused]
 *     responses:
 *       200:
 *         description: Updated record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecord'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateAttendance = async (req, res) => {
  const { status } = req.body
  const validStatuses = ['present', 'absent', 'late', 'excused']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
  }

  try {
    const existing = await prisma.attendance.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' })

    const record = await prisma.attendance.update({
      where: { id: req.params.id },
      data: { status },
      include: attendanceInclude,
    })
    return res.json(record)
  } catch (err) {
    console.error('updateAttendance error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/attendance/{id}:
 *   delete:
 *     summary: Delete an attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
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
export const deleteAttendance = async (req, res) => {
  try {
    const existing = await prisma.attendance.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' })

    await prisma.attendance.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Attendance record deleted' })
  } catch (err) {
    console.error('deleteAttendance error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
