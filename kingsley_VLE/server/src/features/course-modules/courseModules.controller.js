import prisma from '../../config/prisma.js'

const moduleInclude = {
  course: { select: { id: true, title: true } },
  section: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true, year: true } },
}

// ── List ─────────────────────────────────────────────────────────────────────
export const listCourseModules = async (req, res) => {
  const { courseId, sectionId, semesterId, status, search, page = 1, limit = 50 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {}
  if (courseId) where.courseId = courseId
  if (sectionId) where.sectionId = sectionId
  if (semesterId) where.semesterId = semesterId
  if (status) where.status = status
  if (search) where.name = { contains: search, mode: 'insensitive' }

  try {
    const [modules, total] = await Promise.all([
      prisma.courseModule.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: moduleInclude,
      }),
      prisma.courseModule.count({ where }),
    ])
    return res.json({ modules, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('listCourseModules error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// ── Get by ID ─────────────────────────────────────────────────────────────────
export const getCourseModule = async (req, res) => {
  try {
    const mod = await prisma.courseModule.findUnique({
      where: { id: req.params.id },
      include: moduleInclude,
    })
    if (!mod) return res.status(404).json({ error: 'Course module not found' })
    return res.json(mod)
  } catch (err) {
    console.error('getCourseModule error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export const createCourseModule = async (req, res) => {
  const { name, description, status = 'active', courseId, sectionId, semesterId } = req.body

  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  if (!courseId) return res.status(400).json({ error: 'courseId is required' })
  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or inactive' })
  }

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return res.status(400).json({ error: 'Course not found' })

    const mod = await prisma.courseModule.create({
      data: {
        name: name.trim(),
        description: description || null,
        status,
        courseId,
        sectionId: sectionId || null,
        semesterId: semesterId || null,
      },
      include: moduleInclude,
    })
    return res.status(201).json(mod)
  } catch (err) {
    console.error('createCourseModule error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
export const updateCourseModule = async (req, res) => {
  const { name, description, status, sectionId, semesterId } = req.body

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or inactive' })
  }

  try {
    const existing = await prisma.courseModule.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Course module not found' })

    const mod = await prisma.courseModule.update({
      where: { id: req.params.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(status ? { status } : {}),
        ...(sectionId !== undefined ? { sectionId: sectionId || null } : {}),
        ...(semesterId !== undefined ? { semesterId: semesterId || null } : {}),
      },
      include: moduleInclude,
    })
    return res.json(mod)
  } catch (err) {
    console.error('updateCourseModule error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteCourseModule = async (req, res) => {
  try {
    const existing = await prisma.courseModule.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Course module not found' })

    await prisma.courseModule.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Course module deleted' })
  } catch (err) {
    console.error('deleteCourseModule error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
