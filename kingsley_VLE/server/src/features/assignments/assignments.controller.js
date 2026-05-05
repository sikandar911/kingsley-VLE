import prisma from "../../config/prisma.js";
import mammoth from "mammoth";
import { generateSecureSASUrl, deleteFromAzure } from "../../config/azure.storage.js";

const assignmentBaseInclude = {
  course: true,
  section: true,
  semester: true,
  courseModule: { select: { id: true, name: true, status: true } },
  teacher: {
    select: {
      id: true,
      teacherId: true,
      fullName: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
  assignmentFiles: {
    include: {
      file: true,
    },
  },
  rubrics: true,
};

// Include for a full submission (parent + attempts)
const submissionInclude = {
  student: {
    select: {
      id: true,
      studentId: true,
      fullName: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  },
  markedByTeacher: {
    select: {
      id: true,
      teacherId: true,
      fullName: true,
    },
  },
  attempts: {
    where: { deletedAt: null },
    orderBy: { attemptNumber: "asc" },
    select: {
      id: true,
      submissionId: true,
      attemptNumber: true,
      submissionText: true,
      submissionFileId: true,
      submissionFileIds: true,
      submissionFileUrl: true,
      status: true,
      wordCount: true,
      feedback: true,
      isQualifiedForEqa: true,
      studentSelect: true,
      submittedAt: true,
      updatedAt: true,
      submissionFile: true,
    },
  },
};

// Populate submissionFiles array on each attempt from JSON submissionFileIds
const populateAttemptFiles = async (attempts) => {
  for (const attempt of attempts) {
    if (attempt.submissionFileIds) {
      try {
        const fileIds = JSON.parse(attempt.submissionFileIds);
        console.log(`[POPULATE] Attempt ${attempt.id}: fileIds=${JSON.stringify(fileIds)}`);
        if (fileIds?.length > 0) {
          attempt.submissionFiles = await prisma.file.findMany({
            where: { id: { in: fileIds } },
          });
          console.log(`[POPULATE] Fetched ${attempt.submissionFiles.length} files:`, attempt.submissionFiles.map(f => ({ id: f.id, name: f.name, fileUrl: f.fileUrl?.substring(0, 100) })));
        } else {
          attempt.submissionFiles = [];
        }
      } catch (e) {
        console.error(`[POPULATE] Error parsing fileIds:`, e.message);
        attempt.submissionFiles = [];
      }
    } else {
      attempt.submissionFiles = attempt.submissionFile
        ? [attempt.submissionFile]
        : [];
    }
  }
};

const parseDate = (value) => (value ? new Date(value) : null);

/**
 * Extract word count from a DOCX file using mammoth.
 * Requires file object with slug (blob name) and fileName.
 * Returns null if extraction fails or file is not DOCX.
 */
const extractDocxWordCount = async (fileSlug, fileName) => {
  try {
    console.log(`[DOCX] Processing: ${fileName}`);
    
    if (!fileName || !fileName.toLowerCase().endsWith(".docx")) {
      console.log(`[DOCX] Skipping non-DOCX file: ${fileName}`);
      return null;
    }
    
    // Generate SAS URL for secure Azure Blob access
    console.log(`[DOCX] Generating SAS URL for: ${fileName}`);
    const sasUrl = await generateSecureSASUrl(fileSlug);
    
    if (!sasUrl) {
      console.error(`[DOCX] Failed to generate SAS URL for: ${fileName}`);
      return null;
    }
    
    console.log(`[DOCX] Fetching from Azure with SAS: ${fileName}`);
    const response = await fetch(sasUrl);
    
    if (!response.ok) {
      console.warn(`[DOCX] Fetch failed with status ${response.status}: ${fileName}`);
      return null;
    }
    
    console.log(`[DOCX] Fetch success, extracting text...`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`[DOCX] Buffer size: ${buffer.length} bytes`);
    const result = await mammoth.extractRawText({ buffer });
    const text = result?.value ?? "";
    
    console.log(`[DOCX] Extracted text length: ${text.length}`);
    if (text.length > 0) {
      console.log(`[DOCX] First 200 chars: "${text.substring(0, 200)}"`);
    } else {
      console.log(`[DOCX] WARNING: No text extracted from ${fileName}`);
    }
    
    const words = text.match(/\b[\w]+(?:['-][\w]+)*\b/g) || []
    const wordCount = words.length
    
    console.log(`[DOCX] Word count: ${wordCount} for ${fileName}`);
    return wordCount > 0 ? wordCount : null;
  } catch (err) {
    console.error(`[DOCX] ERROR extracting from ${fileName}:`, err.message);
    console.error(`[DOCX] Stack:`, err.stack);
    return null;
  }
};

const normalizeRubrics = (rubrics) => {
  if (!Array.isArray(rubrics)) return [];

  return rubrics
    .filter((item) => item && item.criteria)
    .map((item) => ({
      criteria: String(item.criteria).trim(),
      maxMarks: Number(item.maxMarks),
    }))
    .filter(
      (item) =>
        item.criteria && Number.isFinite(item.maxMarks) && item.maxMarks > 0,
    );
};

const getTeacherProfileByUserId = (userId) =>
  prisma.teacherProfile.findUnique({ where: { userId } });

const getStudentProfileByUserId = (userId) =>
  prisma.studentProfile.findUnique({ where: { userId } });

const ensureTeacherCanManageCourse = async (
  teacherProfileId,
  courseId,
  sectionId,
) => {
  const [teacherCourse, section] = await Promise.all([
    prisma.teacherCourse.findFirst({
      where: {
        teacherId: teacherProfileId,
        courseId,
      },
    }),
    sectionId
      ? prisma.section.findUnique({
          where: { id: sectionId },
          select: { id: true, courseId: true },
        })
      : Promise.resolve(null),
  ]);

  if (section && section.courseId !== courseId) {
    return {
      ok: false,
      error: "Section does not belong to the selected course",
    };
  }

  const canManage = Boolean(teacherCourse);
  if (!canManage) {
    return {
      ok: false,
      error: "Teacher is not assigned to the selected course",
    };
  }

  return { ok: true };
};

const buildAssignmentPayload = ({ body, teacherId, keepStatus = true }) => {
  const rubrics = normalizeRubrics(body.rubrics);
  const assignmentFileIds = Array.isArray(body.assignmentFileIds)
    ? body.assignmentFileIds
    : [];

  const data = {
    title: body.title,
    description: body.description || null,
    teacherInstruction: body.instructions || body.teacherInstruction || null,
    teacherId,
    dueDate: parseDate(body.dueDate),
    totalMarks: body.totalMarks !== undefined ? Number(body.totalMarks) : 100,
    passingMarks:
      body.passingMarks !== undefined && body.passingMarks !== null
        ? Number(body.passingMarks)
        : null,
    requiredWordCount:
      body.requiredWordCount !== undefined && body.requiredWordCount !== null
        ? Number(body.requiredWordCount)
        : null,
    allowLateSubmission: Boolean(body.allowLateSubmission),
    targetType: body.targetType || (body.sectionId ? "section" : "individual"),
    courseId: body.courseId,
    sectionId: body.sectionId || null,
    semesterId: body.semesterId || null,
    courseModuleId: body.courseModuleId || null,
  };

  if (keepStatus) {
    data.status = body.status || "draft";
  }

  if (rubrics.length) {
    data.rubrics = {
      create: rubrics,
    };
  }

  if (assignmentFileIds.length) {
    data.assignmentFiles = {
      create: assignmentFileIds.map((fileId) => ({ fileId })),
    };
  }

  return data;
};

const validateAssignmentPayload = async (body, { requireTeacherId }) => {
  if (!body.title || !body.courseId) {
    return "title and courseId are required";
  }

  if (!body.semesterId) {
    return "semesterId is required";
  }

  if (!body.sectionId) {
    return "sectionId is required";
  }

  const totalMarks =
    body.totalMarks !== undefined ? Number(body.totalMarks) : 100;
  const passingMarks =
    body.passingMarks !== undefined && body.passingMarks !== null
      ? Number(body.passingMarks)
      : null;

  if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
    return "totalMarks must be a positive number";
  }

  if (
    passingMarks !== null &&
    (!Number.isFinite(passingMarks) ||
      passingMarks < 0 ||
      passingMarks > totalMarks)
  ) {
    return "passingMarks must be between 0 and totalMarks";
  }

  if (requireTeacherId && !body.teacherId) {
    return "teacherId is required";
  }

  if (body.status && !["draft", "published", "closed"].includes(body.status)) {
    return "status must be draft, published, or closed";
  }

  if (body.targetType && !["section", "individual"].includes(body.targetType)) {
    return "targetType must be section or individual";
  }

  if (body.sectionId) {
    const section = await prisma.section.findUnique({
      where: { id: body.sectionId },
    });
    if (!section) return "Selected section was not found";
    if (section.courseId !== body.courseId)
      return "sectionId does not belong to the selected course";
  }

  return null;
};

const getStudentEnrollmentScope = async (studentProfileId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: studentProfileId },
    select: {
      courseId: true,
      sectionId: true,
      semesterId: true,
    },
  });

  const courseIds = [
    ...new Set(enrollments.map((item) => item.courseId).filter(Boolean)),
  ];
  const sectionIds = [
    ...new Set(enrollments.map((item) => item.sectionId).filter(Boolean)),
  ];
  const semesterIds = [
    ...new Set(enrollments.map((item) => item.semesterId).filter(Boolean)),
  ];

  return { enrollments, courseIds, sectionIds, semesterIds };
};

const buildStudentAssignmentWhere = ({
  id,
  courseIds,
  sectionIds,
  semesterIds,
}) => {
  const filters = [
    { status: "published" },
    { courseId: { in: courseIds } },
    {
      OR: [
        { sectionId: null },
        ...(sectionIds.length ? [{ sectionId: { in: sectionIds } }] : []),
      ],
    },
    {
      OR: [
        { semesterId: null },
        ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
      ],
    },
  ];

  if (id) {
    filters.unshift({ id });
  }

  return { AND: filters };
};

const getTeacherManagedAssignmentWhere = async (userId, extraWhere = {}) => {
  const teacherProfile = await getTeacherProfileByUserId(userId);
  if (!teacherProfile) {
    return { teacherProfile: null, where: null };
  }

  return {
    teacherProfile,
    where: {
      teacherId: teacherProfile.id,
      ...extraWhere,
    },
  };
};

/**
 * Create calendar reminder for assignment automatically when published
 */
const createAssignmentCalendarReminder = async (
  assignment,
  createdByUserId,
) => {
  try {
    // Only create reminder if assignment has a dueDate and status is published
    if (!assignment.dueDate || assignment.status !== "published") {
      return null;
    }

    // Extract just the date from dueDate in local time so it matches the calendar grid
    const reminderDate = new Date(assignment.dueDate);
    reminderDate.setHours(0, 0, 0, 0);

    const reminder = await prisma.calendarReminder.create({
      data: {
        date: reminderDate,
        name: `Assignment Due: ${assignment.title}`,
        type: "assignment",
        assignmentId: assignment.id,
        courseId: assignment.courseId || null,
        sectionId: assignment.sectionId || null,
        semesterId: assignment.semesterId || null,
        targetRole: "student", // Students need to see assignment reminders
        createdBy: createdByUserId,
        isAutoGenerated: true,
      },
    });

    return reminder;
  } catch (err) {
    console.error("Error creating assignment calendar reminder:", err);
    // Don't fail assignment creation if reminder creation fails
    return null;
  }
};

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create an assignment with optional rubric criteria and attachments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, courseId]
 *             properties:
 *               teacherId:
 *                 type: string
 *                 description: Required for admin users; ignored for teacher users
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               totalMarks:
 *                 type: integer
 *               passingMarks:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               allowLateSubmission:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published, closed]
 *               targetType:
 *                 type: string
 *                 enum: [section, individual]
 *               assignmentFileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               rubrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     criteria:
 *                       type: string
 *                     maxMarks:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
export const createAssignment = async (req, res) => {
  try {
    const validationError = await validateAssignmentPayload(req.body, {
      requireTeacherId: req.user.role === "admin",
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    let teacherId = req.body.teacherId;

    if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile) {
        return res.status(400).json({ error: "Teacher profile not found" });
      }

      const permission = await ensureTeacherCanManageCourse(
        teacherProfile.id,
        req.body.courseId,
        req.body.sectionId,
      );
      if (!permission.ok) {
        return res.status(403).json({ error: permission.error });
      }

      teacherId = teacherProfile.id;
    } else {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { id: teacherId },
      });
      if (!teacherProfile) {
        return res
          .status(400)
          .json({ error: "Selected teacherId was not found" });
      }
    }

    const assignmentFileIds = Array.isArray(req.body.assignmentFileIds)
      ? req.body.assignmentFileIds
      : [];
    if (assignmentFileIds.length) {
      const fileCount = await prisma.file.count({
        where: { id: { in: assignmentFileIds } },
      });
      if (fileCount !== assignmentFileIds.length) {
        return res
          .status(400)
          .json({ error: "One or more assignmentFileIds are invalid" });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        ...buildAssignmentPayload({ body: req.body, teacherId }),
        createdBy: req.user.id,
      },
      include: {
        ...assignmentBaseInclude,
      },
    });

    // Automatically create calendar reminder if assignment is published with a due date
    if (assignment.status === "published" && assignment.dueDate) {
      await createAssignmentCalendarReminder(assignment, req.user.id);
    }

    return res.status(201).json(assignment);
  } catch (err) {
    console.error("Create assignment error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: List assignments for the current user
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, closed]
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 */
export const listAssignments = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.courseId) filters.courseId = req.query.courseId;
    if (req.query.sectionId) filters.sectionId = req.query.sectionId;

    let where = filters;

    if (req.user.role === "teacher") {
      const scoped = await getTeacherManagedAssignmentWhere(
        req.user.id,
        filters,
      );
      if (!scoped.teacherProfile) {
        return res.status(400).json({ error: "Teacher profile not found" });
      }
      where = scoped.where;
    }

    if (req.user.role === "student") {
      const studentProfile = await getStudentProfileByUserId(req.user.id);
      if (!studentProfile) {
        return res.status(400).json({ error: "Student profile not found" });
      }

      const { courseIds, sectionIds, semesterIds } =
        await getStudentEnrollmentScope(studentProfile.id);
      // console.log(
      //   "[listAssignments] Student courseIds from enrollments:",
      //   courseIds,
      // );
      // console.log(
      //   "[listAssignments] Requested courseId filter:",
      //   filters.courseId,
      // );
      if (!courseIds.length) {
        return res.json([]);
      }

      // If specific course/section filters provided, scope to those if student is enrolled
      // Otherwise fall back to all enrolled courses
      let filteredCourseIds = courseIds;
      let filteredSectionIds = sectionIds;
      let filteredSemesterIds = semesterIds;

      if (filters.courseId) {
        // If student requested a specific course, check if they're enrolled
        const isEnrolled = courseIds.includes(filters.courseId);
        // console.log(
        //   "[listAssignments] Is student enrolled in requested course?",
        //   isEnrolled,
        // );
        if (isEnrolled) {
          filteredCourseIds = [filters.courseId];
        } else {
          // If not in enrollment list, still allow fetching but restrict to empty result
          // This prevents "not found" errors for legitimate requests
          // console.log(
          //   "[listAssignments] Student NOT enrolled in course, returning empty array",
          // );
          return res.json([]);
        }
      }

      if (filters.sectionId) {
        if (sectionIds.includes(filters.sectionId)) {
          filteredSectionIds = [filters.sectionId];
        } else {
          return res.json([]);
        }
      }

      where = buildStudentAssignmentWhere({
        courseIds: filteredCourseIds,
        sectionIds: filteredSectionIds,
        semesterIds: filteredSemesterIds,
      });
      // console.log(
      //   "[listAssignments] Built where filter for student:",
      //   JSON.stringify(where, null, 2),
      // );
    }

    // console.log(
    //   "[listAssignments] Final where filter:",
    //   JSON.stringify(where, null, 2),
    // );
    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        ...assignmentBaseInclude,
        _count: {
          select: {
            submissions: true,
          },
        },
        submissions:
          req.user.role === "student"
            ? {
                where: {
                  student: {
                    userId: req.user.id,
                  },
                  deletedAt: null,
                },
                orderBy: { createdAt: "desc" },
                take: 1,
                include: submissionInclude,
              }
            : false,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    // Filter out soft-deleted assignments
    const activeAssignments = assignments.filter((a) => !a.deletedAt);

    // Populate attempt files
    for (const assignment of activeAssignments) {
      if (Array.isArray(assignment.submissions)) {
        for (const sub of assignment.submissions) {
          if (Array.isArray(sub.attempts)) {
            await populateAttemptFiles(sub.attempts);
          }
        }
      }
    }

    return res.json(activeAssignments);
  } catch (err) {
    console.error("List assignments error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get assignment details
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Assignment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAssignmentById = async (req, res) => {
  try {
    let assignment = null;

    if (req.user.role === "student") {
      const studentProfile = await getStudentProfileByUserId(req.user.id);
      if (!studentProfile) {
        return res.status(400).json({ error: "Student profile not found" });
      }

      const { courseIds, sectionIds, semesterIds } =
        await getStudentEnrollmentScope(studentProfile.id);
      if (!courseIds.length) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      assignment = await prisma.assignment.findFirst({
        where: buildStudentAssignmentWhere({
          id: req.params.id,
          courseIds,
          sectionIds,
          semesterIds,
        }),
        include: {
          ...assignmentBaseInclude,
          submissions: {
            where: {
              studentId: studentProfile.id,
              deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
            include: submissionInclude,
          },
        },
      });
    } else if (req.user.role === "teacher") {
      const scoped = await getTeacherManagedAssignmentWhere(req.user.id, {
        id: req.params.id,
      });
      if (!scoped.teacherProfile) {
        return res.status(400).json({ error: "Teacher profile not found" });
      }

      assignment = await prisma.assignment.findFirst({
        where: scoped.where,
        include: {
          ...assignmentBaseInclude,
          submissions: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: submissionInclude,
          },
        },
      });
    } else {
      assignment = await prisma.assignment.findUnique({
        where: { id: req.params.id },
        include: {
          ...assignmentBaseInclude,
          submissions: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: submissionInclude,
          },
        },
      });
    }

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Populate attempt files on all submissions
    if (Array.isArray(assignment.submissions)) {
      for (const sub of assignment.submissions) {
        if (Array.isArray(sub.attempts)) {
          await populateAttemptFiles(sub.attempts);
        }
      }
    }

    return res.json(assignment);
  } catch (err) {
    console.error("Get assignment error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/{id}:
 *   put:
 *     summary: Update an assignment and replace rubric criteria when provided
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated assignment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
export const updateAssignment = async (req, res) => {
  try {
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { rubrics: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    let teacherId = existing.teacherId;

    if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile) {
        return res.status(400).json({ error: "Teacher profile not found" });
      }
      if (existing.teacherId !== teacherProfile.id) {
        return res
          .status(403)
          .json({ error: "You can only update your own assignments" });
      }

      const courseId = req.body.courseId || existing.courseId;
      const sectionId =
        req.body.sectionId !== undefined
          ? req.body.sectionId
          : existing.sectionId;
      const permission = await ensureTeacherCanManageCourse(
        teacherProfile.id,
        courseId,
        sectionId,
      );
      if (!permission.ok) {
        return res.status(403).json({ error: permission.error });
      }
    } else if (
      req.body.teacherId &&
      req.body.teacherId !== existing.teacherId
    ) {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { id: req.body.teacherId },
      });
      if (!teacherProfile) {
        return res
          .status(400)
          .json({ error: "Selected teacherId was not found" });
      }
      teacherId = teacherProfile.id;
    }

    const mergedPayload = {
      ...existing,
      ...req.body,
      courseId: req.body.courseId || existing.courseId,
      sectionId:
        req.body.sectionId !== undefined
          ? req.body.sectionId
          : existing.sectionId,
      semesterId:
        req.body.semesterId !== undefined
          ? req.body.semesterId
          : existing.semesterId,
      totalMarks:
        req.body.totalMarks !== undefined
          ? req.body.totalMarks
          : existing.totalMarks,
      passingMarks:
        req.body.passingMarks !== undefined
          ? req.body.passingMarks
          : existing.passingMarks,
      status: req.body.status || existing.status,
      targetType: req.body.targetType || existing.targetType,
    };

    const validationError = await validateAssignmentPayload(mergedPayload, {
      requireTeacherId: false,
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const assignmentFileIds = Array.isArray(req.body.assignmentFileIds)
      ? req.body.assignmentFileIds
      : null;
    if (assignmentFileIds?.length) {
      const fileCount = await prisma.file.count({
        where: { id: { in: assignmentFileIds } },
      });
      if (fileCount !== assignmentFileIds.length) {
        return res
          .status(400)
          .json({ error: "One or more assignmentFileIds are invalid" });
      }
    }

    const updateData = {
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      teacherInstruction:
        req.body.instructions ??
        req.body.teacherInstruction ??
        existing.teacherInstruction,
      teacherId,
      dueDate:
        req.body.dueDate !== undefined
          ? parseDate(req.body.dueDate)
          : existing.dueDate,
      totalMarks:
        req.body.totalMarks !== undefined
          ? Number(req.body.totalMarks)
          : existing.totalMarks,
      passingMarks:
        req.body.passingMarks !== undefined
          ? req.body.passingMarks === null
            ? null
            : Number(req.body.passingMarks)
          : existing.passingMarks,
      requiredWordCount:
        req.body.requiredWordCount !== undefined
          ? req.body.requiredWordCount === null
            ? null
            : Number(req.body.requiredWordCount)
          : existing.requiredWordCount,
      allowLateSubmission:
        req.body.allowLateSubmission !== undefined
          ? Boolean(req.body.allowLateSubmission)
          : existing.allowLateSubmission,
      status: req.body.status || existing.status,
      targetType: req.body.targetType || existing.targetType,
      courseId: req.body.courseId || existing.courseId,
      sectionId:
        req.body.sectionId !== undefined
          ? req.body.sectionId
          : existing.sectionId,
      semesterId:
        req.body.semesterId !== undefined
          ? req.body.semesterId
          : existing.semesterId,
      courseModuleId:
        req.body.courseModuleId !== undefined
          ? req.body.courseModuleId
          : existing.courseModuleId,
    };

    if (Array.isArray(req.body.rubrics)) {
      const rubrics = normalizeRubrics(req.body.rubrics);
      updateData.rubrics = {
        deleteMany: {},
        create: rubrics,
      };
    }

    if (assignmentFileIds) {
      updateData.assignmentFiles = {
        deleteMany: {},
        create: assignmentFileIds.map((fileId) => ({ fileId })),
      };
    }

    const updated = await prisma.assignment.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        ...assignmentBaseInclude,
      },
    });

    // Handle calendar reminder: create or delete based on status and dueDate
    if (updated.dueDate && updated.status === "published") {
      // Check if reminder already exists
      const existingReminder = await prisma.calendarReminder.findFirst({
        where: {
          assignmentId: updated.id,
          type: "assignment",
        },
      });

      if (!existingReminder) {
        // Create new reminder if it doesn't exist
        await createAssignmentCalendarReminder(updated, req.user.id);
      }
    } else if (!updated.dueDate || updated.status !== "published") {
      // Delete reminder if assignment lost its dueDate or is no longer published
      await prisma.calendarReminder.deleteMany({
        where: {
          assignmentId: updated.id,
          type: "assignment",
        },
      });
    }

    return res.json(updated);
  } catch (err) {
    console.error("Update assignment error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/{id}/status:
 *   patch:
 *     summary: Update assignment publication status
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, published, closed]
 *     responses:
 *       200:
 *         description: Assignment status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
export const updateAssignmentStatus = async (req, res) => {
  const { status } = req.body;
  if (!["draft", "published", "closed"].includes(status)) {
    return res
      .status(400)
      .json({ error: "status must be draft, published, or closed" });
  }

  try {
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile || teacherProfile.id !== existing.teacherId) {
        return res
          .status(403)
          .json({ error: "You can only update your own assignments" });
      }
    }

    const updated = await prisma.assignment.update({
      where: { id: req.params.id },
      data: { status },
      include: assignmentBaseInclude,
    });

    // Handle calendar reminder based on new status
    if (status === "published" && updated.dueDate) {
      // When publishing, create reminder if it doesn't exist
      const existingReminder = await prisma.calendarReminder.findFirst({
        where: {
          assignmentId: updated.id,
          type: "assignment",
        },
      });

      if (!existingReminder) {
        await createAssignmentCalendarReminder(updated, req.user.id);
      }
    } else if (status !== "published") {
      // When unpublishing, delete the reminder
      await prisma.calendarReminder.deleteMany({
        where: {
          assignmentId: updated.id,
          type: "assignment",
        },
      });
    }

    return res.json(updated);
  } catch (err) {
    console.error("Update assignment status error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/{id}:
 *   delete:
 *     summary: Delete an assignment (soft delete - sets deletedAt timestamp)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Assignment not found
 *       403:
 *         description: Not authorized to delete this assignment
 */
export const deleteAssignment = async (req, res) => {
  try {
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: {
        submissions: {
          where: { deletedAt: null },
          include: {
            attempts: {
              where: { deletedAt: null },
              select: { id: true, submissionFileIds: true },
            },
          },
        },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile || teacherProfile.id !== existing.teacherId) {
        return res
          .status(403)
          .json({ error: "You can only delete your own assignments" });
      }
    }

    // Delete all submission attempt files from Azure
    console.log(`[DELETE_ASSIGNMENT] Cleaning up files for assignment ${req.params.id}`);
    for (const submission of existing.submissions) {
      for (const attempt of submission.attempts) {
        if (attempt.submissionFileIds) {
          try {
            const fileIds = JSON.parse(attempt.submissionFileIds);
            if (Array.isArray(fileIds) && fileIds.length > 0) {
              // Get file slugs and delete from Azure
              const files = await prisma.file.findMany({
                where: { id: { in: fileIds } },
                select: { id: true, slug: true, name: true },
              });
              for (const file of files) {
                console.log(`[DELETE_ASSIGNMENT] Deleting file from Azure: ${file.name} (slug: ${file.slug})`);
                await deleteFromAzure(file.slug);
              }
            }
          } catch (e) {
            console.error(`[DELETE_ASSIGNMENT] Error processing files for attempt ${attempt.id}:`, e.message);
          }
        }
      }
    }

    // Soft delete: set deletedAt timestamp
    await prisma.assignment.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    // Clean up calendar reminders associated with this assignment
    await prisma.calendarReminder.deleteMany({
      where: {
        assignmentId: req.params.id,
        type: "assignment",
      },
    });

    console.log(`[DELETE_ASSIGNMENT] Assignment ${req.params.id} deleted successfully with all associated files`);
    return res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error("Delete assignment error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Delete a submission attempt (student can only delete attempts without feedback)
 */
export const deleteSubmissionAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.submissionAttempt.findUnique({
      where: { id: attemptId },
      include: {
        submission: {
          include: {
            student: true,
            assignment: true,
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // Students can only delete attempts without feedback
    if (req.user.role === "student") {
      const studentProfile = await getStudentProfileByUserId(req.user.id);
      if (!studentProfile || attempt.submission.student.id !== studentProfile.id) {
        return res.status(403).json({ error: "You can only delete your own attempts" });
      }

      if (attempt.feedback) {
        return res.status(400).json({
          error: "Cannot delete attempts with teacher feedback. Contact your instructor if you need to remove this attempt.",
        });
      }
    }

    // Delete files from Azure if any exist
    console.log(`[DELETE_ATTEMPT] Deleting attempt ${attemptId} with files`);
    if (attempt.submissionFileIds) {
      try {
        const fileIds = JSON.parse(attempt.submissionFileIds);
        if (Array.isArray(fileIds) && fileIds.length > 0) {
          const files = await prisma.file.findMany({
            where: { id: { in: fileIds } },
            select: { id: true, slug: true, name: true },
          });
          for (const file of files) {
            console.log(`[DELETE_ATTEMPT] Deleting file from Azure: ${file.name}`);
            await deleteFromAzure(file.slug);
          }
        }
      } catch (e) {
        console.error(`[DELETE_ATTEMPT] Error deleting files:`, e.message);
      }
    }

    // Soft delete the attempt
    await prisma.submissionAttempt.update({
      where: { id: attemptId },
      data: { deletedAt: new Date() },
    });

    console.log(`[DELETE_ATTEMPT] Attempt ${attemptId} deleted successfully`);
    return res.json({ message: "Attempt deleted successfully" });
  } catch (err) {
    console.error("Delete submission attempt error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   post:
 *     summary: Submit or resubmit an assignment as a student
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               submissionText:
 *                 type: string
 *               submissionFileId:
 *                 type: string
 *               submissionFileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               submissionFileUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Submission created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 */
export const submitAssignment = async (req, res) => {
  const {
    submissionText,
    submissionFileId,
    submissionFileIds,
    submissionFileUrl,
  } = req.body;

  if (!submissionFileId && !submissionFileIds?.length && !submissionFileUrl) {
    return res.status(400).json({
      error: "At least 1 file must be provided for submission",
    });
  }

  try {
    const studentProfile = await getStudentProfileByUserId(req.user.id);
    if (!studentProfile) {
      return res.status(400).json({ error: "Student profile not found" });
    }

    const { courseIds, sectionIds, semesterIds } =
      await getStudentEnrollmentScope(studentProfile.id);
    if (!courseIds.length) {
      return res.status(403).json({ error: "You are not enrolled in any course" });
    }

    const assignment = await prisma.assignment.findFirst({
      where: buildStudentAssignmentWhere({
        id: req.params.id,
        courseIds,
        sectionIds,
        semesterIds,
      }),
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.status !== "published") {
      return res.status(400).json({ error: "Only published assignments can receive submissions" });
    }

    const now = new Date();
    const isLate = Boolean(assignment.dueDate && now > assignment.dueDate);
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({ error: "Late submission is not allowed for this assignment" });
    }

    // Find or create the parent submission record
    let parentSubmission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId: assignment.id,
        studentId: studentProfile.id,
        deletedAt: null,
      },
    });

    // If locked (student confirmed EQA), block new attempts
    if (parentSubmission && parentSubmission.eqaStatus === "LOCKED") {
      return res.status(400).json({
        error: "Submission is locked after EQA confirmation. No further attempts allowed.",
      });
    }

    if (!parentSubmission) {
      parentSubmission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment.id,
          studentId: studentProfile.id,
          iqaStatus: "PENDING",
          eqaStatus: "NOT_APPLICABLE",
        },
      });
    }

    // Validate single file
    if (submissionFileId) {
      const file = await prisma.file.findUnique({ where: { id: submissionFileId } });
      if (!file) return res.status(400).json({ error: "submissionFileId is invalid" });
    }

    // Validate multiple files
    let fileIdsToStore = [];
    if (submissionFileIds?.length > 0) {
      if (submissionFileIds.length > 5) {
        return res.status(400).json({ error: "Maximum 5 files allowed per submission" });
      }
      const files = await prisma.file.findMany({
        where: { id: { in: submissionFileIds } },
        select: { id: true },
      });
      if (files.length !== submissionFileIds.length) {
        return res.status(400).json({ error: "One or more submissionFileIds are invalid" });
      }
      fileIdsToStore = submissionFileIds;
    }

    // Count existing attempts
    const attemptCount = await prisma.submissionAttempt.count({
      where: { submissionId: parentSubmission.id, deletedAt: null },
    });

    const attempt = await prisma.submissionAttempt.create({
      data: {
        submissionId: parentSubmission.id,
        attemptNumber: attemptCount + 1,
        submissionText: submissionText || null,
        submissionFileId: submissionFileId || null,
        submissionFileIds: fileIdsToStore.length > 0 ? JSON.stringify(fileIdsToStore) : null,
        submissionFileUrl: submissionFileUrl || null,
        status: isLate ? "late" : "submitted",
        isQualifiedForEqa: false,
        studentSelect: false,
        wordCount: null,
      },
      include: { submissionFile: true },
    });

    // Populate files on the attempt
    await populateAttemptFiles([attempt]);

    // ── Server-side word count for DOCX files ────────────────────────────────
    console.log(`[SUBMIT] Attempt has ${attempt.submissionFiles?.length || 0} files`);
    if (attempt.submissionFiles?.length > 0) {
      console.log(`[SUBMIT] Files:`, attempt.submissionFiles.map(f => ({ name: f.name, slug: f.slug })));
      const docxFile = attempt.submissionFiles.find((f) =>
        f.name?.toLowerCase().endsWith(".docx")
      );
      if (docxFile) {
        console.log(`[SUBMIT] Found DOCX file: ${docxFile.name}`);
        const wordCount = await extractDocxWordCount(docxFile.slug, docxFile.name);
        console.log(`[SUBMIT] Extraction result: ${wordCount}`);
        if (wordCount !== null) {
          console.log(`[SUBMIT] Updating attempt ${attempt.id} with wordCount=${wordCount}`);
          await prisma.submissionAttempt.update({
            where: { id: attempt.id },
            data: { wordCount },
          });
          attempt.wordCount = wordCount;
        }
      } else {
        console.log(`[SUBMIT] No DOCX files found in submission`);
      }
    }

    // Return the full parent submission with all attempts
    const fullSubmission = await prisma.assignmentSubmission.findUnique({
      where: { id: parentSubmission.id },
      include: submissionInclude,
    });
    await populateAttemptFiles(fullSubmission.attempts);

    return res.status(201).json(fullSubmission);
  } catch (err) {
    console.error("Submit assignment error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   get:
 *     summary: List submissions for an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submission list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 */
export const listAssignmentSubmissions = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
    });
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    let where = { assignmentId: req.params.id, deletedAt: null };

    if (req.user.role === "student") {
      const studentProfile = await getStudentProfileByUserId(req.user.id);
      if (!studentProfile) {
        return res.status(400).json({ error: "Student profile not found" });
      }
      where.studentId = studentProfile.id;
    } else if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile || teacherProfile.id !== assignment.teacherId) {
        return res.status(403).json({
          error: "You can only view submissions for your own assignments",
        });
      }
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where,
      include: submissionInclude,
      orderBy: { createdAt: "desc" },
    });

    for (const sub of submissions) {
      await populateAttemptFiles(sub.attempts);
    }

    return res.json(submissions);
  } catch (err) {
    console.error("List assignment submissions error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/submissions/{submissionId}:
 *   patch:
 *     summary: Update a student submission (notes or files) before grading
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               submissionText:
 *                 type: string
 *               submissionFileId:
 *                 type: string
 *               submissionFileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 */
export const updateSubmission = async (req, res) => {
  const { submissionText, submissionFileId, submissionFileIds } = req.body;
  try {
    const attempt = await prisma.submissionAttempt.findUnique({
      where: { id: req.params.submissionId },
      include: {
        submission: {
          include: { assignment: true, student: true },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: "Submission attempt not found" });
    }

    const parentSubmission = attempt.submission;

    // Block editing if submission is locked
    if (parentSubmission.eqaStatus === "LOCKED") {
      return res.status(400).json({ error: "Submission is locked after EQA confirmation" });
    }

    const studentProfile = await getStudentProfileByUserId(req.user.id);
    if (!studentProfile || studentProfile.id !== parentSubmission.student.id) {
      return res.status(403).json({ error: "You can only edit your own submissions" });
    }

    // Block if attempt is already qualified
    if (attempt.isQualifiedForEqa) {
      return res.status(400).json({ error: "Cannot edit an attempt that has been qualified for EQA" });
    }

    // Block if assignment overdue
    const now = new Date();
    if (
      parentSubmission.assignment.dueDate &&
      now > new Date(parentSubmission.assignment.dueDate)
    ) {
      return res.status(400).json({ error: "Cannot edit submission after due date" });
    }

    if (submissionFileId) {
      const file = await prisma.file.findUnique({ where: { id: submissionFileId } });
      if (!file) return res.status(400).json({ error: "submissionFileId is invalid" });
    }

    let fileIdsToStore = undefined;
    if (submissionFileIds !== undefined) {
      fileIdsToStore = null;
      if (submissionFileIds?.length > 0) {
        if (submissionFileIds.length > 5) {
          return res.status(400).json({ error: "Maximum 5 files allowed per submission" });
        }
        const files = await prisma.file.findMany({
          where: { id: { in: submissionFileIds } },
          select: { id: true },
        });
        if (files.length !== submissionFileIds.length) {
          return res.status(400).json({ error: "One or more submissionFileIds are invalid" });
        }
        fileIdsToStore = JSON.stringify(submissionFileIds);
      } else {
        const existingIds = attempt.submissionFileIds
          ? JSON.parse(attempt.submissionFileIds)
          : [];
        if (existingIds.length > 0) {
          return res.status(400).json({
            error: "At least 1 file must remain in the submission. Cannot delete all files.",
          });
        }
      }
    }

    const updateData = {};
    if (submissionText !== undefined) updateData.submissionText = submissionText;
    if (submissionFileId !== undefined) updateData.submissionFileId = submissionFileId;
    if (fileIdsToStore !== undefined) updateData.submissionFileIds = fileIdsToStore;

    const updated = await prisma.submissionAttempt.update({
      where: { id: req.params.submissionId },
      data: updateData,
      include: { submissionFile: true },
    });

    await populateAttemptFiles([updated]);
    return res.json(updated);
  } catch (err) {
    console.error("Update submission error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/submissions/{submissionId}/grade:
 *   patch:
 *     summary: Grade a submission inside the submission record
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marks:
 *                 type: integer
 *               gradeLetter:
 *                 type: string
 *               feedback:
 *                 type: string
 *               markedByTeacherId:
 *                 type: string
 *                 description: Required only if an admin is grading on behalf of a teacher
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 */
export const gradeSubmission = async (req, res) => {
  const { marks, gradeLetter, feedback, markedByTeacherId, attemptId } = req.body;
  try {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: req.params.submissionId },
      include: { assignment: true },
    });

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    let graderTeacherId = markedByTeacherId || null;

    if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile || teacherProfile.id !== submission.assignment.teacherId) {
        return res.status(403).json({
          error: "You can only grade submissions for your own assignments",
        });
      }
      graderTeacherId = teacherProfile.id;
    } else {
      if (!graderTeacherId) {
        return res.status(400).json({
          error: "markedByTeacherId is required when grading as admin",
        });
      }
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { id: graderTeacherId },
      });
      if (!teacherProfile) {
        return res.status(400).json({ error: "markedByTeacherId is invalid" });
      }
    }

    if (marks !== undefined) {
      const numericMarks = Number(marks);
      if (
        !Number.isFinite(numericMarks) ||
        numericMarks < 0 ||
        numericMarks > submission.assignment.totalMarks
      ) {
        return res.status(400).json({
          error: `marks must be between 0 and ${submission.assignment.totalMarks}`,
        });
      }
    }

    // If feedback is provided for a specific attempt, update that attempt too
    if (attemptId && feedback !== undefined) {
      await prisma.submissionAttempt.update({
        where: { id: attemptId },
        data: { feedback },
      });
    }

    const graded = await prisma.assignmentSubmission.update({
      where: { id: req.params.submissionId },
      data: {
        marks: marks !== undefined ? Number(marks) : submission.marks,
        gradeLetter: gradeLetter !== undefined ? gradeLetter : submission.gradeLetter,
        markedBy: graderTeacherId,
        markedAt: new Date(),
      },
      include: {
        ...submissionInclude,
        assignment: { include: assignmentBaseInclude },
      },
    });

    await populateAttemptFiles(graded.attempts);
    return res.json(graded);
  } catch (err) {
    console.error("Grade submission error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ============================================================================
// IQA / EQA WORKFLOW ENDPOINTS
// ============================================================================

/**
 * Teacher: provide feedback on a specific attempt (IQA round).
 * PATCH /api/assignments/attempts/:attemptId/feedback
 * Body: { feedback: string, iqaStatus?: "PENDING"|"IN_REVIEW"|"IQA_PASSED"|"IQA_FAILED" }
 */
export const reviewAttempt = async (req, res) => {
  const { feedback, iqaStatus } = req.body;
  try {
    const attempt = await prisma.submissionAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        submission: { include: { assignment: true } },
      },
    });

    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const assignment = attempt.submission.assignment;

    if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile || teacherProfile.id !== assignment.teacherId) {
        return res.status(403).json({ error: "Not authorized" });
      }
    }

    const updateData = {};
    if (feedback !== undefined) updateData.feedback = feedback;

    const updatedAttempt = await prisma.submissionAttempt.update({
      where: { id: req.params.attemptId },
      data: updateData,
      include: { submissionFile: true },
    });

    // Update parent IQA status if requested
    if (iqaStatus) {
      const validIqaStatuses = ["PENDING", "IN_REVIEW", "IQA_PASSED", "IQA_FAILED"];
      if (!validIqaStatuses.includes(iqaStatus)) {
        return res.status(400).json({ error: "Invalid iqaStatus" });
      }
      await prisma.assignmentSubmission.update({
        where: { id: attempt.submissionId },
        data: { iqaStatus },
      });
    }

    await populateAttemptFiles([updatedAttempt]);

    // Return full parent submission
    const fullSubmission = await prisma.assignmentSubmission.findUnique({
      where: { id: attempt.submissionId },
      include: submissionInclude,
    });
    await populateAttemptFiles(fullSubmission.attempts);
    return res.json(fullSubmission);
  } catch (err) {
    console.error("Review attempt error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Teacher: mark an attempt as qualified for EQA.
 * PATCH /api/assignments/attempts/:attemptId/qualify
 */
export const qualifyAttemptForEqa = async (req, res) => {
  try {
    const attempt = await prisma.submissionAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        submission: { include: { assignment: true } },
      },
    });

    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const assignment = attempt.submission.assignment;

    if (req.user.role === "teacher") {
      const teacherProfile = await getTeacherProfileByUserId(req.user.id);
      if (!teacherProfile || teacherProfile.id !== assignment.teacherId) {
        return res.status(403).json({ error: "Not authorized" });
      }
    }

    // Unqualify all other attempts for this submission
    await prisma.submissionAttempt.updateMany({
      where: { submissionId: attempt.submissionId },
      data: { isQualifiedForEqa: false },
    });

    // Qualify this attempt
    await prisma.submissionAttempt.update({
      where: { id: req.params.attemptId },
      data: { isQualifiedForEqa: true },
    });

    // Update parent: IQA_PASSED, EQA pending student confirmation
    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: attempt.submissionId },
      data: {
        iqaStatus: "IQA_PASSED",
        eqaStatus: "PENDING_STUDENT_CONFIRMATION",
        finalQualifiedAttemptId: req.params.attemptId,
      },
      include: submissionInclude,
    });

    await populateAttemptFiles(updatedSubmission.attempts);
    return res.json(updatedSubmission);
  } catch (err) {
    console.error("Qualify attempt error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Student: confirm (StudentSelect) the qualified attempt for EQA, locking the submission.
 * PATCH /api/assignments/attempts/:attemptId/student-select
 */
export const studentSelectAttempt = async (req, res) => {
  try {
    const attempt = await prisma.submissionAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        submission: { include: { student: true } },
      },
    });

    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const parentSubmission = attempt.submission;

    const studentProfile = await getStudentProfileByUserId(req.user.id);
    if (!studentProfile || studentProfile.id !== parentSubmission.student.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (!attempt.isQualifiedForEqa) {
      return res.status(400).json({
        error: "This attempt has not been qualified for EQA by the teacher yet",
      });
    }

    if (parentSubmission.eqaStatus !== "PENDING_STUDENT_CONFIRMATION") {
      return res.status(400).json({
        error: "Submission is not awaiting student EQA confirmation",
      });
    }

    // Mark studentSelect on this attempt
    await prisma.submissionAttempt.update({
      where: { id: req.params.attemptId },
      data: { studentSelect: true },
    });

    // Lock the parent submission
    const lockedSubmission = await prisma.assignmentSubmission.update({
      where: { id: parentSubmission.id },
      data: { eqaStatus: "LOCKED" },
      include: submissionInclude,
    });

    await populateAttemptFiles(lockedSubmission.attempts);
    return res.json(lockedSubmission);
  } catch (err) {
    console.error("Student select attempt error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/assignments/meta:
 *   get:
 *     summary: Get courses (with sections) and teachers for the assignment creation form
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses with sections, and teachers array (admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignmentMetaResponse'
 */
export const getAssignmentsMeta = async (req, res) => {
  try {
    let courseWhere = {};

    if (req.user.role === "teacher") {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!teacherProfile)
        return res.status(400).json({ error: "Teacher profile not found" });

      const teacherCourses = await prisma.teacherCourse.findMany({
        where: { teacherId: teacherProfile.id },
        select: { courseId: true },
      });
      const courseIds = teacherCourses.map((tc) => tc.courseId);
      courseWhere = courseIds.length
        ? { id: { in: courseIds } }
        : { id: { in: [] } };
    }

    const courses = await prisma.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        semesterId: true,
        semester: { select: { id: true, name: true, year: true } },
        sections: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { title: "asc" },
    });

    const result = { courses };

    if (req.user.role === "admin") {
      const teachers = await prisma.teacherProfile.findMany({
        select: {
          id: true,
          teacherId: true,
          fullName: true,
          user: { select: { email: true } },
        },
        orderBy: { fullName: "asc" },
      });
      result.teachers = teachers;
    }

    return res.json(result);
  } catch (err) {
    console.error("Assignment meta error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
