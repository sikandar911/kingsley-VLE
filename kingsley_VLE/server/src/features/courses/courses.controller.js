import prisma from "../../config/prisma.js";
import { deleteFromAzure } from "../../config/azure.storage.js";

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management endpoints
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: List all courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title or description
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseListResponse'
 */
export const listCourses = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  try {
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          semester: { select: { id: true, name: true, year: true } },
          sections: {
            select: { id: true, name: true, totalStudentCount: true },
          },
          teacherAssignments: {
            include: {
              teacher: {
                select: { id: true, fullName: true, teacherId: true },
              },
            },
          },
          _count: {
            select: { enrollments: true, assignments: true, sections: true },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);
    return res.json({
      data: courses,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("listCourses error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get a course by ID
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Course data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getCourse = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        semester: {
          select: {
            id: true,
            name: true,
            year: true,
            session: { select: { id: true, name: true } },
          },
        },
        sections: {
          include: {
            semester: { select: { id: true, name: true } },
            teacherAssignments: {
              include: {
                teacher: {
                  select: { id: true, fullName: true, teacherId: true },
                },
              },
            },
            _count: { select: { enrollments: true } },
          },
        },
        teacherAssignments: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                teacherId: true,
                user: { select: { email: true } },
              },
            },
          },
        },
        _count: {
          select: { enrollments: true, assignments: true, sections: true },
        },
      },
    });
    if (!course) return res.status(404).json({ error: "Course not found" });
    return res.json(course);
  } catch (err) {
    console.error("getCourse error:", err);
    // Surface migration-related column errors in a readable form
    if (err.code === 'P2010' || (err.message && err.message.includes('column'))) {
      return res.status(500).json({
        error: "Database schema mismatch — run `npx prisma migrate deploy` on the server",
        detail: err.message,
      });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Course created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createCourse = async (req, res) => {
  const { title, description, semesterId } = req.body;
  if (!title?.trim())
    return res.status(400).json({ error: "Course title is required" });
  if (!semesterId)
    return res.status(400).json({ error: "semesterId is required" });

  try {
    const semesterExists = await prisma.semester.findUnique({
      where: { id: semesterId },
    });
    if (!semesterExists)
      return res.status(400).json({ error: "Selected semester not found" });

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        description: description || null,
        semesterId,
        createdBy: req.user.id,
      },
    });
    return res.status(201).json(course);
  } catch (err) {
    console.error("createCourse error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated course
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateCourse = async (req, res) => {
  const { title, description, semesterId } = req.body;
  try {
    const existing = await prisma.course.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: "Course not found" });

    if (semesterId) {
      const semesterExists = await prisma.semester.findUnique({
        where: { id: semesterId },
      });
      if (!semesterExists)
        return res.status(400).json({ error: "Selected semester not found" });
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(description !== undefined
          ? { description: description || null }
          : {}),
        ...(semesterId !== undefined ? { semesterId: semesterId || null } : {}),
      },
    });
    return res.json(course);
  } catch (err) {
    console.error("updateCourse error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete a course (admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Course deleted
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
export const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const existing = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!existing) return res.status(404).json({ error: "Course not found" });

    // Pre-fetch IDs needed for cascading deletes (relations without onDelete: Cascade)
    const [sections, assignments, materials] = await Promise.all([
      prisma.section.findMany({ where: { courseId }, select: { id: true } }),
      prisma.assignment.findMany({ where: { courseId }, select: { id: true } }),
      prisma.classMaterial.findMany({ where: { courseId }, include: { file: true } }),
    ]);

    const sectionIds = sections.map((s) => s.id);
    const assignmentIds = assignments.map((a) => a.id);

    // Clean up Azure blobs for class materials
    for (const material of materials) {
      if (material.file?.slug) await deleteFromAzure(material.file.slug);
    }
    const fileIds = materials.map((m) => m.fileId).filter(Boolean);

    await prisma.$transaction(async (tx) => {
      // 1. Unlink class materials from file records, then delete files
      if (materials.length > 0) {
        await tx.classMaterial.deleteMany({ where: { courseId } });
        if (fileIds.length > 0) {
          await tx.file.deleteMany({ where: { id: { in: fileIds } } });
        }
      }

      // 2. Delete attendance for sections (Attendance.sectionId NOT nullable, no cascade)
      if (sectionIds.length > 0) {
        await tx.attendance.deleteMany({ where: { sectionId: { in: sectionIds } } });
      }

      // 3. Delete assignments + full submission tree (Assignment.courseId NOT nullable, no cascade)
      if (assignmentIds.length > 0) {
        const submissions = await tx.assignmentSubmission.findMany({
          where: { assignmentId: { in: assignmentIds } },
          select: { id: true },
        });
        const submissionIds = submissions.map((s) => s.id);
        if (submissionIds.length > 0) {
          await tx.submissionAttempt.deleteMany({ where: { submissionId: { in: submissionIds } } });
          await tx.assignmentSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
        }
        await tx.calendarReminder.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
        await tx.assignmentRubric.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
        await tx.assignmentFile.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
        await tx.assignment.deleteMany({ where: { courseId } });
      }

      // 4. Delete enrollments (Enrollment.courseId NOT nullable, no cascade)
      await tx.enrollment.deleteMany({ where: { courseId } });

      // 5. Delete teacher-course links (TeacherCourse.courseId NOT nullable, no cascade)
      await tx.teacherCourse.deleteMany({ where: { courseId } });

      // 6. Delete the course — Section, ClassRecord, CourseModule, CourseMessage cascade via schema
      await tx.course.delete({ where: { id: courseId } });
    });

    return res.json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("deleteCourse error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
