import bcrypt from 'bcryptjs'
import prisma from '../../config/prisma.js'

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get own profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true, teacherProfile: true },
    })
    const { passwordHash, ...result } = user
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update own profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               bio:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               bloodGroup:
 *                 type: string
 *               educationBackground:
 *                 type: string
 *               admissionStatus:
 *                 type: string
 *               description:
 *                 type: string
 *               specialization:
 *                 type: string
 *               experienceYears:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
export const updateProfile = async (req, res) => {
  const { password, username, fullName, dateOfBirth, ...profileRest } = req.body

  try {
    const userUpdateData = {}
    if (username !== undefined) userUpdateData.username = username
    if (password) userUpdateData.passwordHash = await bcrypt.hash(password, 10)

    const profileUpdateData = {}
    if (fullName) profileUpdateData.fullName = fullName
    if (dateOfBirth) profileUpdateData.dateOfBirth = new Date(dateOfBirth)
    Object.assign(profileUpdateData, profileRest)

    if (Object.keys(profileUpdateData).length > 0) {
      if (req.user.role === 'student') {
        userUpdateData.studentProfile = { update: profileUpdateData }
      } else if (req.user.role === 'teacher') {
        userUpdateData.teacherProfile = { update: profileUpdateData }
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: userUpdateData,
      include: { studentProfile: true, teacherProfile: true },
    })

    const { passwordHash, ...result } = updated
    return res.json(result)
  } catch (err) {
    console.error('Update profile error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
