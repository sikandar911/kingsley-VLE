import prisma from '../../config/prisma.js'
import { uploadToAzure } from '../../config/azure.storage.js'

const MESSAGE_LIMIT = 50

const VALID_REACTIONS = ['like', 'unlike', 'love', 'ok', 'done']

const messageInclude = {
  user: {
    select: {
      id: true,
      role: true,
      studentProfile: { select: { id: true, fullName: true, profileImage: true } },
      teacherProfile: { select: { id: true, fullName: true, profileImage: true } },
    },
  },
  classMaterial: {
    include: {
      file: { select: { id: true, name: true, fileUrl: true } },
    },
  },
  reactions: {
    include: {
      user: {
        select: {
          id: true,
          studentProfile: { select: { fullName: true } },
          teacherProfile: { select: { fullName: true } },
        },
      },
    },
  },
}

/**
 * GET /api/course-chat/:courseId/sections/:sectionId/messages
 * Query: before=<messageId> (cursor for older messages)
 */
export const listMessages = async (req, res) => {
  const { courseId, sectionId } = req.params
  const { before } = req.query

  try {
    const resolvedSectionId = sectionId === 'null' ? null : (sectionId || null)
    
    // Build where clause:
    // - Students (with specific sectionId) see: messages in their section OR course-wide messages (sectionId=null)
    // - Teachers (with sectionId=null) see: all messages for the course
    const where = {
      courseId,
      deletedAt: null,
    }

    if (resolvedSectionId) {
      // Student view: show section-specific + course-wide messages
      where.OR = [
        { sectionId: resolvedSectionId },
        { sectionId: null },
      ]
    }
    // If no sectionId (teacher view), show all messages for course (no OR needed)

    // Cursor-based pagination: if `before` is given, get messages older than that id
    if (before) {
      const cursor = await prisma.courseMessage.findUnique({
        where: { id: before },
        select: { createdAt: true },
      })
      if (cursor) {
        where.createdAt = { lt: cursor.createdAt }
      }
    }

    const messages = await prisma.courseMessage.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_LIMIT,
    })

    // Return in chronological order (oldest first for display)
    return res.json(messages.reverse())
  } catch (err) {
    console.error('listMessages error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * POST /api/course-chat/:courseId/sections/:sectionId/messages
 * Body: { content } or multipart with file (teacher only)
 */
export const sendMessage = async (req, res) => {
  const { courseId, sectionId } = req.params
  const { content } = req.body
  const resolvedSectionId = sectionId === 'null' ? null : (sectionId || null)

  if (!content?.trim() && !req.file) {
    return res.status(400).json({ error: 'Message content or file is required' })
  }

  try {
    // Verify the course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return res.status(404).json({ error: 'Course not found' })

    let classMaterialId = null

    // Handle file upload (teacher only - enforced at route level)
    if (req.file) {
      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only teachers can upload files' })
      }

      // Upload to Azure
      const { url: fileUrl, blobName } = await uploadToAzure(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      )

      // Create a File record
      const fileRecord = await prisma.file.create({
        data: {
          name: req.file.originalname,
          slug: blobName,
          fileUrl,
          fileType: 'class_material',
          uploadedBy: req.user.id,
        },
      })

      // Create ClassMaterial record
      const material = await prisma.classMaterial.create({
        data: {
          title: req.file.originalname,
          description: content?.trim() || `Shared in course chat`,
          fileId: fileRecord.id,
          fileUrl,
          courseId,
          sectionId: resolvedSectionId,
          uploadedBy: req.user.id,
        },
      })

      classMaterialId = material.id
    }

    const message = await prisma.courseMessage.create({
      data: {
        content: content?.trim() || null,
        courseId,
        sectionId: resolvedSectionId,
        userId: req.user.id,
        classMaterialId: classMaterialId || null,
      },
      include: messageInclude,
    })

    return res.status(201).json(message)
  } catch (err) {
    console.error('sendMessage error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * POST /api/course-chat/:courseId/sections/:sectionId/messages/:messageId/reactions
 * Body: { type: 'like' | 'unlike' | 'love' | 'ok' | 'done' }
 * Toggles reaction: if same type exists → remove it; if different → update it; if none → create it
 */
export const toggleReaction = async (req, res) => {
  const { messageId } = req.params
  const { type } = req.body

  if (!VALID_REACTIONS.includes(type)) {
    return res.status(400).json({ error: `Invalid reaction type. Valid: ${VALID_REACTIONS.join(', ')}` })
  }

  try {
    const message = await prisma.courseMessage.findUnique({ where: { id: messageId } })
    if (!message || message.deletedAt) {
      return res.status(404).json({ error: 'Message not found' })
    }

    const existing = await prisma.courseMessageReaction.findUnique({
      where: { messageId_userId: { messageId, userId: req.user.id } },
    })

    if (existing) {
      if (existing.type === type) {
        // Same type → remove (toggle off)
        await prisma.courseMessageReaction.delete({
          where: { messageId_userId: { messageId, userId: req.user.id } },
        })
      } else {
        // Different type → update
        await prisma.courseMessageReaction.update({
          where: { messageId_userId: { messageId, userId: req.user.id } },
          data: { type },
        })
      }
    } else {
      // No reaction → create
      await prisma.courseMessageReaction.create({
        data: { messageId, userId: req.user.id, type },
      })
    }

    // Return updated message with reactions
    const updated = await prisma.courseMessage.findUnique({
      where: { id: messageId },
      include: messageInclude,
    })

    return res.json(updated)
  } catch (err) {
    console.error('toggleReaction error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

/**
 * DELETE /api/course-chat/:courseId/sections/:sectionId/messages/:messageId
 * Soft delete — only owner or admin can delete
 */
export const deleteMessage = async (req, res) => {
  const { messageId } = req.params

  try {
    const message = await prisma.courseMessage.findUnique({ where: { id: messageId } })
    if (!message || message.deletedAt) {
      return res.status(404).json({ error: 'Message not found' })
    }

    if (message.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own messages' })
    }

    await prisma.courseMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('deleteMessage error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
