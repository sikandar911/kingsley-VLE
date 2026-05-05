import prisma from '../../config/prisma.js'
import mammoth from 'mammoth'
import { uploadToAzure, deleteFromAzure, generateSecureSASUrl } from '../../config/azure.storage.js'

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File upload and management (Azure Blob Storage)
 */

/**
 * Extract word count from DOCX buffer
 */
const extractWordCountFromBuffer = async (buffer, fileName) => {
  try {
    if (!fileName || !fileName.toLowerCase().endsWith('.docx')) {
      return null
    }
    const result = await mammoth.extractRawText({ buffer })
    const text = result?.value ?? ''
    // Count words like Microsoft Word does:
    // Matches sequences of word characters with optional hyphens/apostrophes within
    // Examples: "word", "don't", "mother-in-law" (3 words), "123", "word's"
    const words = text.match(/\b[\w]+(?:['-][\w]+)*\b/g) || []
    const wordCount = words.length
    return wordCount > 0 ? wordCount : null
  } catch (err) {
    console.error(`[FILE_UPLOAD] Error extracting word count from ${fileName}:`, err.message)
    return null
  }
}

/**
 * @swagger
 * /api/files:
 *   post:
 *     summary: Upload a file to Azure Blob Storage
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               fileType:
 *                 type: string
 *                 enum: [assignment, class_material, class_record, submission]
 *     responses:
 *       201:
 *         description: File uploaded, returns File record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: No file provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })

    const { fileType } = req.body

    // Students can only upload submission files
    if (req.user.role === 'student' && fileType && fileType !== 'submission') {
      return res.status(403).json({ error: 'Students can only upload submission files' })
    }

    const { buffer, originalname, mimetype } = req.file

    const { url, blobName } = await uploadToAzure(buffer, originalname, mimetype)

    // Extract word count for DOCX files
    const wordCount = await extractWordCountFromBuffer(buffer, originalname)

    const file = await prisma.file.create({
      data: {
        name: originalname,
        slug: blobName,
        fileUrl: url,
        fileType: fileType || null,
        uploadedBy: req.user.id,
      },
    })

    // Return file with wordCount property (not persisted to DB, just for frontend validation)
    const response = { ...file, wordCount }
    return res.status(201).json(response)
  } catch (err) {
    console.error('uploadFile error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: List uploaded files (admin/teacher)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fileType
 *         schema:
 *           type: string
 *           enum: [assignment, class_material, class_record, submission]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileListResponse'
 */
export const listFiles = async (req, res) => {
  const { fileType, page = 1, limit = 20 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const where = {}
  if (fileType) where.fileType = fileType
  // teachers only see their own files
  if (req.user.role === 'teacher') where.uploadedBy = req.user.id

  try {
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { uploadedAt: 'desc' },
        include: { uploadedByUser: { select: { id: true, email: true, role: true } } },
      }),
      prisma.file.count({ where }),
    ])
    return res.json({ files, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('listFiles error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get a file record by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getFile = async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
      include: { uploadedByUser: { select: { id: true, email: true, role: true } } },
    })
    if (!file) return res.status(404).json({ error: 'File not found' })
    return res.json(file)
  } catch (err) {
    console.error('getFile error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete a file from Azure and the database
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File deleted
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
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const deleteFile = async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } })
    if (!file) return res.status(404).json({ error: 'File not found' })

    // Only the uploader or admin can delete
    if (req.user.role !== 'admin' && file.uploadedBy !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await deleteFromAzure(file.slug)
    await prisma.file.delete({ where: { id: file.id } })

    return res.json({ message: 'File deleted successfully' })
  } catch (err) {
    console.error('deleteFile error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * @swagger
 * /api/files/{id}/secure-url:
 *   get:
 *     summary: Get a secure SAS-signed URL for a file (for viewing/downloading)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: File ID
 *     responses:
 *       200:
 *         description: Secure SAS-signed URL (valid for 7 days)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: SAS-signed Azure Blob URL
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getSecureFileUrl = async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } })
    if (!file) return res.status(404).json({ error: 'File not found' })

    // Generate a fresh SAS URL (valid for 7 days)
    const sasUrl = await generateSecureSASUrl(file.slug)
    if (!sasUrl) return res.status(500).json({ error: 'Failed to generate secure URL' })

    return res.json({ url: sasUrl })
  } catch (err) {
    console.error('getSecureFileUrl error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
