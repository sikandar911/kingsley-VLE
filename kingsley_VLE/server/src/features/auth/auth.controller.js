import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../../config/prisma.js'

// Constants
const MAX_LOGIN_ATTEMPTS = 3
const LOCK_TIME_MINUTES = 5
const LOCK_TIME_MS = LOCK_TIME_MINUTES * 60 * 1000

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login for all users (admin, teacher, student)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or username
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful - returns token and user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Account locked due to too many failed attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const login = async (req, res) => {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' })
  }

  try {
    // Step 1: Find the user
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
        isActive: true,
      },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Step 2: Check if account is locked
    const now = new Date()
    if (user.lockedUntil && now < user.lockedUntil) {
      return res
        .status(429)
        .json({ error: 'Account temporarily locked. Please try again in a few minutes.' })
    }

    // Step 3: If lock period has expired, reset attempts
    if (user.lockedUntil && now >= user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      })
    }

    // Step 4: Verify password
    let isValid = false
    try {
      isValid = await bcrypt.compare(password, user.passwordHash)
    } catch (bcryptErr) {
      console.error('Bcrypt comparison error:', bcryptErr)
      return res.status(500).json({ error: 'Authentication service error. Please try again.' })
    }

    if (!isValid) {
      // Wrong password - increment failed attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1
      const updateData = { failedLoginAttempts: newFailedAttempts }

      // Lock account if max attempts reached
      if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(now.getTime() + LOCK_TIME_MS)
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        })
        return res
          .status(401)
          .json({ error: `Wrong password. Account locked for ${LOCK_TIME_MINUTES} minutes.` })
      }

      // Not locked yet, just increment
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })

      const attemptsRemaining = MAX_LOGIN_ATTEMPTS - newFailedAttempts
      return res.status(401).json({
        error: `Wrong password. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining before account lockout.`,
      })
    }

    // Step 5: Successful login - reset failed attempts and clear lock
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    // Step 6: Generate JWT token
    let token
    try {
      token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRY || '24h' }
      )
    } catch (jwtErr) {
      console.error('JWT generation error:', jwtErr)
      return res.status(500).json({ error: 'Token generation failed. Please try again.' })
    }

    // Step 7: Return user without password hash
    const { passwordHash, failedLoginAttempts, lockedUntil, ...userWithoutSensitiveData } = user
    return res.status(200).json({ token, user: userWithoutSensitiveData })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true, teacherProfile: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    const { passwordHash, failedLoginAttempts, lockedUntil, ...result } = user
    return res.status(200).json(result)
  } catch (err) {
    console.error('Get me error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
