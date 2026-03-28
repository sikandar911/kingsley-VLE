import prisma from '../../config/prisma.js'
import { deleteFromAzure } from '../../config/azure.storage.js'

/**
 * @swagger
 * tags:
 *   name: ClassMaterials
 *   description: Class learning materials (linked to uploaded files)
 */

const materialInclude = {
  file: true,
  course: { select: { id: true, title: true } },
  section: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true, year: true } },
  uploadedByUser: { select: { id: true, email: true, role: true } },
}

/**
 * @swagger
 * /api/class-materials:
 *   get:
 *     summary: List class materials
 *     tags: [ClassMaterials]
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
 *         description: List of materials
 */
export const listClassMaterials = async (req, res) => {
  const { courseId, sectionId, semesterId, page = 1, limit = 20 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = {}
  if (courseId) where.courseId = courseId
  if (sectionId) where.sectionId = sectionId
  if (semesterId) where.semesterId = semesterId

  try {
    const [materials, total] = await Promise.all([
      prisma.classMaterial.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: materialInclude,
      }),
      prisma.classMaterial.count({ where }),
    ])
    return res.json({ materials, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('listClassMaterials error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-materials/{id}:
 *   get:
 *     summary: Get a class material by ID
 *     tags: [ClassMaterials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Class material record
 *       404:
 *         description: Not found
 */
export const getClassMaterial = async (req, res) => {
  try {
    const material = await prisma.classMaterial.findUnique({
      where: { id: req.params.id },
      include: materialInclude,
    })
    if (!material) return res.status(404).json({ error: 'Class material not found' })
    return res.json(material)
  } catch (err) {
    console.error('getClassMaterial error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-materials:
 *   post:
 *     summary: Create a class material linked to a previously uploaded file
 *     tags: [ClassMaterials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, fileId, courseId]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               fileId:
 *                 type: string
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created class material
 *       400:
 *         description: Validation error
 */
export const createClassMaterial = async (req, res) => {
  const { title, description, fileId, courseId, sectionId, semesterId } = req.body

  if (!title?.trim()) return res.status(400).json({ error: 'title is required' })
  if (!fileId) return res.status(400).json({ error: 'fileId is required' })
  if (!courseId) return res.status(400).json({ error: 'courseId is required' })

  try {
    const [file, course] = await Promise.all([
      prisma.file.findUnique({ where: { id: fileId } }),
      prisma.course.findUnique({ where: { id: courseId } }),
    ])
    if (!file) return res.status(400).json({ error: 'File not found — upload the file first' })
    if (!course) return res.status(400).json({ error: 'Course not found' })

    // Ensure file isn't already linked to another material
    const existingMaterial = await prisma.classMaterial.findUnique({ where: { fileId } })
    if (existingMaterial) return res.status(400).json({ error: 'This file is already linked to a class material' })

    const material = await prisma.classMaterial.create({
      data: {
        title: title.trim(),
        description: description || null,
        fileId,
        courseId,
        sectionId: sectionId || null,
        semesterId: semesterId || null,
        uploadedBy: req.user.id,
      },
      include: materialInclude,
    })
    return res.status(201).json(material)
  } catch (err) {
    console.error('createClassMaterial error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-materials/{id}:
 *   put:
 *     summary: Update a class material
 *     tags: [ClassMaterials]
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
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated material
 *       404:
 *         description: Not found
 */
export const updateClassMaterial = async (req, res) => {
  const { title, description, sectionId, semesterId } = req.body

  try {
    const existing = await prisma.classMaterial.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Class material not found' })

    const material = await prisma.classMaterial.update({
      where: { id: req.params.id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(sectionId !== undefined ? { sectionId: sectionId || null } : {}),
        ...(semesterId !== undefined ? { semesterId: semesterId || null } : {}),
      },
      include: materialInclude,
    })
    return res.json(material)
  } catch (err) {
    console.error('updateClassMaterial error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/class-materials/{id}:
 *   delete:
 *     summary: Delete a class material and its associated file from Azure
 *     tags: [ClassMaterials]
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
 *       404:
 *         description: Not found
 */
export const deleteClassMaterial = async (req, res) => {
  try {
    const material = await prisma.classMaterial.findUnique({
      where: { id: req.params.id },
      include: { file: true },
    })
    if (!material) return res.status(404).json({ error: 'Class material not found' })

    // Delete blob from Azure, then File record, then ClassMaterial
    await deleteFromAzure(material.file?.slug)
    await prisma.classMaterial.delete({ where: { id: material.id } })
    if (material.fileId) {
      await prisma.file.delete({ where: { id: material.fileId } }).catch(() => {})
    }

    return res.json({ message: 'Class material and file deleted successfully' })
  } catch (err) {
    console.error('deleteClassMaterial error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
