import prisma from "../../config/prisma.js";
import { uploadToAzure } from "../../config/azure.storage.js";

const MESSAGE_LIMIT = 50;

const VALID_REACTIONS = ["like", "unlike", "love", "ok", "done"];

const messageInclude = {
  user: {
    select: {
      id: true,
      role: true,
      studentProfile: {
        select: { id: true, fullName: true, profileImage: true },
      },
      teacherProfile: {
        select: { id: true, fullName: true, profileImage: true },
      },
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
};

/**
 * GET /api/course-chat/:courseId/sections/:sectionId/messages
 * Query: before=<messageId> (cursor for older messages)
 */
export const listMessages = async (req, res) => {
  const { courseId, sectionId } = req.params;
  const { before } = req.query;

  try {
    const resolvedSectionId = sectionId === "null" ? null : sectionId || null;

    // Build where clause:
    // - Students (with specific sectionId) see: messages in their section OR course-wide messages (sectionId=null)
    // - Teachers (with sectionId=null) see: all messages for the course
    const where = {
      courseId,
      deletedAt: null,
    };

    if (resolvedSectionId) {
      // Student view: show section-specific + course-wide messages
      where.OR = [{ sectionId: resolvedSectionId }, { sectionId: null }];
    }
    // If no sectionId (teacher view), show all messages for course (no OR needed)

    // Cursor-based pagination: if `before` is given, get messages older than that id
    if (before) {
      const cursor = await prisma.courseMessage.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (cursor) {
        where.createdAt = { lt: cursor.createdAt };
      }
    }

    const messages = await prisma.courseMessage.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: MESSAGE_LIMIT,
    });

    // Return in chronological order (oldest first for display)
    return res.json(messages.reverse());
  } catch (err) {
    console.error("listMessages error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * POST /api/course-chat/:courseId/sections/:sectionId/messages
 * Body: { content } or multipart with file (teacher only)
 */
export const sendMessage = async (req, res) => {
  const { courseId, sectionId } = req.params;
  const { content } = req.body;
  const resolvedSectionId = sectionId === "null" ? null : sectionId || null;

  if (!content?.trim() && !req.file) {
    return res
      .status(400)
      .json({ error: "Message content or file is required" });
  }

  try {
    // Verify the course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: "Course not found" });

    let classMaterialId = null;

    // Handle file upload (teacher only - enforced at route level)
    if (req.file) {
      if (req.user.role !== "teacher" && req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Only teachers can upload files" });
      }

      // Look up the teacher's enrollment to get sectionId and semesterId
      // This ensures we upload materials to the correct section+semester context
      let resolvedUploadSectionId = null;
      let resolvedSemesterId = null;

      if (req.user.role === "teacher") {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId: req.user.id },
          select: { id: true },
        });

        if (teacherProfile) {
          // Find the teacher's enrollment for this course
          // - If uploading from specific section: match that section
          // - If uploading course-wide (sectionId=null): find ANY section they teach in
          const teacherCourseWhere = {
            teacherId: teacherProfile.id,
            courseId,
          };

          // Only filter by sectionId if uploading from a specific section
          if (resolvedSectionId) {
            teacherCourseWhere.sectionId = resolvedSectionId;
          }

          const teacherCourse = await prisma.teacherCourse.findFirst({
            where: teacherCourseWhere,
            select: {
              sectionId: true,
              semesterId: true,
              section: { select: { semesterId: true } },
            },
          });

          if (teacherCourse) {
            resolvedUploadSectionId = teacherCourse.sectionId;
            // Use TeacherCourse's semesterId if available,
            // otherwise fall back to the Section's semesterId (if sectionId exists)
            resolvedSemesterId =
              teacherCourse.semesterId ||
              teacherCourse.section?.semesterId ||
              null;
          }
        }
      }

      // Upload to Azure
      const { url: fileUrl, blobName } = await uploadToAzure(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      // Create a File record
      const fileRecord = await prisma.file.create({
        data: {
          name: req.file.originalname,
          slug: blobName,
          fileUrl,
          fileType: "class_material",
          uploadedBy: req.user.id,
        },
      });

      // Create ClassMaterial record with section + semester from teacher's enrollment
      // Strip HTML tags from content for plain text description
      const plainTextDescription = content?.trim()
        ? content.replace(/<[^>]*>/g, "").trim() || `Shared in course chat`
        : `Shared in course chat`;

      // Fetch the latest active course module for this course/section
      let courseModuleId = null;
      // console.log('\n========== [sendMessage] MODULE ASSIGNMENT START ==========' )
      // console.log('[sendMessage] Resolving module with:', {
      //   courseId,
      //   resolvedUploadSectionId,
      //   resolvedSemesterId,
      // })

      if (courseId) {
        try {
          // console.log('[sendMessage] ✓ courseId exists, proceeding with module query...')

          // First, try to find active modules for this specific section + course
          // console.log('[sendMessage] Query 1: Searching for section-specific active modules (sectionId =', resolvedUploadSectionId, ')')
          let activeModules = await prisma.courseModule.findMany({
            where: {
              courseId,
              sectionId: resolvedUploadSectionId, // Match the specific section
              status: "active",
            },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              name: true,
              status: true,
              sectionId: true,
              courseId: true,
            },
          });

          // console.log('[sendMessage] Query 1 result: Found', activeModules.length, 'modules', activeModules)

          // If no section-specific module found, look for course-wide modules (sectionId=null)
          if (activeModules.length === 0) {
            // console.log('[sendMessage] Query 2: No section-specific modules, searching for course-wide modules (sectionId = null)...')
            activeModules = await prisma.courseModule.findMany({
              where: {
                courseId,
                sectionId: null, // Course-wide modules
                status: "active",
              },
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: {
                id: true,
                name: true,
                status: true,
                sectionId: true,
                courseId: true,
              },
            });
            // console.log('[sendMessage] Query 2 result: Found', activeModules.length, 'modules', activeModules)
          }

          if (activeModules.length > 0) {
            courseModuleId = activeModules[0].id;
            // console.log(`[sendMessage] ✓ ASSIGNED module ${courseModuleId} (${activeModules[0].name})`)
          } else {
            console.warn(
              "[sendMessage] ✗ No active modules found in any query",
            );
          }
        } catch (err) {
          console.error(
            "[sendMessage] ✗ ERROR fetching modules:",
            err.message,
            err.stack,
          );
        }
      } else {
        console.warn(
          "[sendMessage] ✗ Missing courseId - skipping module assignment",
        );
      }
      // console.log('========== [sendMessage] MODULE ASSIGNMENT END ==========' + '\n')

      const material = await prisma.classMaterial.create({
        data: {
          title: req.file.originalname,
          description: plainTextDescription,
          fileId: fileRecord.id,
          fileUrl,
          courseId,
          sectionId: resolvedUploadSectionId,
          semesterId: resolvedSemesterId,
          courseModuleId, // Include the latest active module (or null if none found)
          uploadedBy: req.user.id,
        },
      });

      // console.log('[sendMessage] Created material with courseModuleId:', material.courseModuleId)

      classMaterialId = material.id;
    }

    const message = await prisma.courseMessage.create({
      data: {
        content: content?.trim() ? content.trim() : null,
        courseId,
        sectionId: resolvedSectionId,
        userId: req.user.id,
        classMaterialId: classMaterialId || null,
      },
      include: messageInclude,
    });

    return res.status(201).json(message);
  } catch (err) {
    console.error("sendMessage error:", {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack,
    });
    return res.status(500).json({
      error: "Server error",
      details: err.message, // For debugging - remove in production
    });
  }
};

/**
 * POST /api/course-chat/:courseId/sections/:sectionId/messages/:messageId/reactions
 * Body: { type: 'like' | 'unlike' | 'love' | 'ok' | 'done' }
 * Toggles reaction: if same type exists → remove it; if different → update it; if none → create it
 */
export const toggleReaction = async (req, res) => {
  const { messageId } = req.params;
  const { type } = req.body;

  if (!VALID_REACTIONS.includes(type)) {
    return res
      .status(400)
      .json({
        error: `Invalid reaction type. Valid: ${VALID_REACTIONS.join(", ")}`,
      });
  }

  try {
    const message = await prisma.courseMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) {
      return res.status(404).json({ error: "Message not found" });
    }

    const existing = await prisma.courseMessageReaction.findUnique({
      where: { messageId_userId: { messageId, userId: req.user.id } },
    });

    if (existing) {
      if (existing.type === type) {
        // Same type → remove (toggle off)
        await prisma.courseMessageReaction.delete({
          where: { messageId_userId: { messageId, userId: req.user.id } },
        });
      } else {
        // Different type → update
        await prisma.courseMessageReaction.update({
          where: { messageId_userId: { messageId, userId: req.user.id } },
          data: { type },
        });
      }
    } else {
      // No reaction → create
      await prisma.courseMessageReaction.create({
        data: { messageId, userId: req.user.id, type },
      });
    }

    // Return updated message with reactions
    const updated = await prisma.courseMessage.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });

    return res.json(updated);
  } catch (err) {
    console.error("toggleReaction error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * GET /api/course-chat/:courseId/sections/:sectionId/members
 * Returns enrolled students + assigned teachers for @mention dropdown
 */
export const getCourseMembers = async (req, res) => {
  const { courseId, sectionId } = req.params;
  const resolvedSectionId = sectionId === "null" ? null : sectionId || null;

  try {
    const [enrollments, teacherCourses] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          courseId,
          ...(resolvedSectionId ? { sectionId: resolvedSectionId } : {}),
        },
        include: {
          student: {
            include: { user: { select: { id: true } } },
          },
        },
      }),
      prisma.teacherCourse.findMany({
        where: {
          courseId,
          ...(resolvedSectionId ? { sectionId: resolvedSectionId } : {}),
        },
        include: {
          teacher: {
            include: { user: { select: { id: true } } },
          },
        },
      }),
    ]);

    const seen = new Set();
    const members = [];

    for (const e of enrollments) {
      const uid = e.student.user.id;
      if (!seen.has(uid)) {
        seen.add(uid);
        members.push({ id: uid, name: e.student.fullName, role: "student" });
      }
    }

    for (const tc of teacherCourses) {
      const uid = tc.teacher.user.id;
      if (!seen.has(uid)) {
        seen.add(uid);
        members.push({ id: uid, name: tc.teacher.fullName, role: "teacher" });
      }
    }

    return res.json(members);
  } catch (err) {
    console.error("getCourseMembers error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * DELETE /api/course-chat/:courseId/sections/:sectionId/messages/:messageId
 * Soft delete — only owner or admin can delete
 */
export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await prisma.courseMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.userId !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "You can only delete your own messages" });
    }

    await prisma.courseMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteMessage error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
