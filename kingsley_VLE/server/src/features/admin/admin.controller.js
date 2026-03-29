import bcrypt from 'bcryptjs'
import prisma from '../../config/prisma.js'

/**
 * @swagger
 * /api/admin/users/bulk:
 *   post:
 *     summary: Bulk create student accounts from a validated list (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [students]
 *             properties:
 *               students:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [fullName, email, password]
 *                   properties:
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     username:
 *                       type: string
 *                     password:
 *                       type: string
 *                     phone:
 *                       type: string
 *     responses:
 *       201:
 *         description: Bulk creation result - created and failed counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: integer
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                       email:
 *                         type: string
 *                       reason:
 *                         type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const bulkCreateStudents = async (req, res) => {
  const { students } = req.body

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'students array is required and must not be empty' })
  }

  if (students.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 students per bulk upload' })
  }

  const created = []
  const failed = []

  for (let i = 0; i < students.length; i++) {
    const { fullName, email, username, password, phone } = students[i]
    const row = i + 1

    if (!fullName?.trim() || !email?.trim() || !password) {
      failed.push({ row, email: email || '', reason: 'fullName, email, and password are required' })
      continue
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      failed.push({ row, email: email.trim(), reason: 'Invalid email format' })
      continue
    }

    try {
      const existsQuery = [{ email: email.trim() }]
      if (username?.trim()) existsQuery.push({ username: username.trim() })
      const exists = await prisma.user.findFirst({ where: { OR: existsQuery } })
      if (exists) {
        failed.push({ row, email: email.trim(), reason: 'Email or username already exists' })
        continue
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const timestamp = Date.now() + i

      const user = await prisma.user.create({
        data: {
          username: username?.trim() || null,
          email: email.trim(),
          passwordHash,
          role: 'student',
          createdBy: req.user.id,
          studentProfile: {
            create: {
              fullName: fullName.trim(),
              studentId: `STU-${timestamp}`,
              phone: phone?.trim() || null,
            },
          },
        },
        include: { studentProfile: true },
      })

      const { passwordHash: _ph, ...result } = user
      created.push(result)
    } catch (err) {
      console.error(`Bulk create row ${row} error:`, err)
      failed.push({ row, email: email?.trim() || '', reason: 'Server error while creating user' })
    }
  }

  return res.status(201).json({
    created: created.length,
    failed,
    users: created,
  })
}

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a student or teacher account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role, fullName]
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, teacher]
 *               fullName:
 *                 type: string
 *               studentId:
 *                 type: string
 *               teacherId:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       409:
 *         description: Email or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createUser = async (req, res) => {
  const { username, email, password, role, fullName, studentId, teacherId, ...profileRest } = req.body

  if (!email || !password || !role || !fullName) {
    return res.status(400).json({ error: 'email, password, role, and fullName are required' })
  }
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Role must be teacher or student' })
  }

  try {
    const existsQuery = [{ email }]
    if (username) existsQuery.push({ username })
    const exists = await prisma.user.findFirst({ where: { OR: existsQuery } })
    if (exists) return res.status(409).json({ error: 'Email or username already exists' })

    const passwordHash = await bcrypt.hash(password, 10)
    const timestamp = Date.now()

    const user = await prisma.user.create({
      data: {
        username: username || null,
        email,
        passwordHash,
        role,
        createdBy: req.user.id,
        ...(role === 'student'
          ? {
              studentProfile: {
                create: {
                  fullName,
                  studentId: studentId || `STU-${timestamp}`,
                  phone: profileRest.phone || null,
                  address: profileRest.address || null,
                },
              },
            }
          : {
              teacherProfile: {
                create: {
                  fullName,
                  teacherId: teacherId || `TCH-${timestamp}`,
                  specialization: profileRest.specialization || null,
                },
              },
            }),
      },
      include: { studentProfile: true, teacherProfile: true },
    })

    const { passwordHash: ph, ...result } = user
    return res.status(201).json(result)
  } catch (err) {
    console.error('Create user error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List all students and teachers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, teacher]
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: Array of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
export const listUsers = async (req, res) => {
  const { role } = req.query
  try {
    const users = await prisma.user.findMany({
      where: { role: role ? role : { in: ['student', 'teacher'] } },
      include: { studentProfile: true, teacherProfile: true },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(users.map(({ passwordHash, ...u }) => u))
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               fullName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { username, email, password, isActive, fullName, ...profileRest } = req.body

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, teacherProfile: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const updateData = {}
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10)

    if (user.role === 'student') {
      const profileUpdate = { fullName: fullName || user.studentProfile?.fullName }
      Object.assign(profileUpdate, profileRest)
      updateData.studentProfile = { upsert: { create: profileUpdate, update: profileUpdate } }
    } else if (user.role === 'teacher') {
      const profileUpdate = { fullName: fullName || user.teacherProfile?.fullName }
      Object.assign(profileUpdate, profileRest)
      updateData.teacherProfile = { upsert: { create: profileUpdate, update: profileUpdate } }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { studentProfile: true, teacherProfile: true },
    })

    const { passwordHash, ...result } = updated
    return res.json(result)
  } catch (err) {
    console.error('Update user error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user account
 *     tags: [Admin]
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
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Cannot delete admin accounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' })

    await prisma.user.delete({ where: { id } })
    return res.json({ message: 'User deleted successfully' })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStats'
 */
export const getStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalCourses] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'teacher' } }),
      prisma.course.count(),
    ])
    return res.json({ totalStudents, totalTeachers, totalCourses })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}
