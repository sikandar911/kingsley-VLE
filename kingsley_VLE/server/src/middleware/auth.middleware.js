import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.js'

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or inactive user' })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' })
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' })
    }
    next()
  }
}
