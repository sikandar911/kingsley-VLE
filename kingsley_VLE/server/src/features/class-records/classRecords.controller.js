import prisma from '../../config/prisma.js'

/**
 * @swagger
 * tags:
 *   name: ClassRecords
 *   description: Class recordings / learning resources (URL-based)
 */

const recordInclude = {
  course: { select: { id: true, title: true } },
  section: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true, year: true } },
}

/**
 * @swagger
 * /api/class-records:
 *   get:
 *     summary: List class records
 *     tags: [ClassRecords]
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
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of class records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassRecordListResponse'
 */
export const listClassRecords = async (req, res) => {
  const { courseId, sectionId, semesterId, page = 1, limit = 20 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = {}
  if (courseId) where.courseId = courseId
  if (sectionId) where.sectionId = sectionId
  if (semesterId) where.semesterId = semesterId

  try {
    const [records, total] = await Promise.all([
      prisma.classRecord.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: recordInclude,
      }),
      prisma.classRecord.count({ where }),
    ])
    return res.json({ records, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('listClassRecords error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-records/{id}:
 *   get:
 *     summary: Get a class record by ID
 *     tags: [ClassRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Class record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassRecord'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getClassRecord = async (req, res) => {
  try {
    const record = await prisma.classRecord.findUnique({
      where: { id: req.params.id },
      include: recordInclude,
    })
    if (!record) return res.status(404).json({ error: 'Class record not found' })
    return res.json(record)
  } catch (err) {
    console.error('getClassRecord error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-records:
 *   post:
 *     summary: Create a class record with a URL (video/resource link)
 *     tags: [ClassRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, url, courseId]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created class record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassRecord'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createClassRecord = async (req, res) => {
  const { title, description, url, courseId, sectionId, semesterId } = req.body

  if (!title?.trim()) return res.status(400).json({ error: 'title is required' })
  if (!url?.trim()) return res.status(400).json({ error: 'url is required' })
  if (!courseId) return res.status(400).json({ error: 'courseId is required' })

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return res.status(400).json({ error: 'Course not found' })

    const record = await prisma.classRecord.create({
      data: {
        title: title.trim(),
        description: description || null,
        url: url.trim(),
        courseId,
        sectionId: sectionId || null,
        semesterId: semesterId || null,
      },
      include: recordInclude,
    })
    return res.status(201).json(record)
  } catch (err) {
    console.error('createClassRecord error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-records/{id}:
 *   put:
 *     summary: Update a class record
 *     tags: [ClassRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassRecord'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateClassRecord = async (req, res) => {
  const { title, description, url, sectionId, semesterId } = req.body

  try {
    const existing = await prisma.classRecord.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Class record not found' })

    const record = await prisma.classRecord.update({
      where: { id: req.params.id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(url?.trim() ? { url: url.trim() } : {}),
        ...(sectionId !== undefined ? { sectionId: sectionId || null } : {}),
        ...(semesterId !== undefined ? { semesterId: semesterId || null } : {}),
      },
      include: recordInclude,
    })
    return res.json(record)
  } catch (err) {
    console.error('updateClassRecord error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-records/{id}:
 *   delete:
 *     summary: Delete a class record
 *     tags: [ClassRecords]
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
export const deleteClassRecord = async (req, res) => {
  try {
    const existing = await prisma.classRecord.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Class record not found' })

    await prisma.classRecord.delete({ where: { id: req.params.id } })
    return res.json({ message: 'Class record deleted successfully' })
  } catch (err) {
    console.error('deleteClassRecord error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
