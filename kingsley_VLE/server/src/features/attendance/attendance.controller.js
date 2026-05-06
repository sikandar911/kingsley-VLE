import prisma from "../../config/prisma.js";

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Student attendance management
 */

const attendanceInclude = {
  student: { select: { id: true, studentId: true, fullName: true } },
  course: { select: { id: true, title: true } },
  section: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true, year: true } },
};

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: List attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema: { type: string }
 *       - in: query
 *         name: studentId
 *         schema: { type: string }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string }
 *       - in: query
 *         name: semesterId
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Exact date (YYYY-MM-DD)
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [present, absent, late, excused]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: List of attendance records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceListResponse'
 */
export const listAttendance = async (req, res) => {
  const {
    courseId,
    studentId,
    sectionId,
    semesterId,
    date,
    from,
    to,
    status,
    page = 1,
    limit = 50,
  } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (courseId) where.courseId = courseId;
  if (sectionId) where.sectionId = sectionId;
  if (semesterId) where.semesterId = semesterId;
  if (status) where.status = status;

  // Students can only see their own attendance
  if (req.user.role === "student") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile)
      return res.status(404).json({ error: "Student profile not found" });
    where.studentId = profile.id;
  } else if (studentId) {
    where.studentId = studentId;
  }

  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.date = { gte: d, lt: next };
  } else if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  try {
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
        include: attendanceInclude,
      }),
      prisma.attendance.count({ where }),
    ]);
    return res.json({
      records,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("listAttendance error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/attendance/{id}:
 *   get:
 *     summary: Get an attendance record by ID
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Attendance record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecord'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const getAttendance = async (req, res) => {
  try {
    const record = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      include: attendanceInclude,
    });
    if (!record)
      return res.status(404).json({ error: "Attendance record not found" });

    // Students can only view their own
    if (req.user.role === "student") {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!profile || record.studentId !== profile.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.json(record);
  } catch (err) {
    console.error("getAttendance error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/attendance:
 *   post:
 *     summary: Mark attendance for a single student
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, courseId, sectionId, semesterId, date, status]
 *             properties:
 *               studentId:
 *                 type: string
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [present, absent, late, excused]
 *     responses:
 *       201:
 *         description: Attendance marked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecord'
 *       400:
 *         description: Validation error or duplicate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const markAttendance = async (req, res) => {
  const { studentId, courseId, sectionId, semesterId, date, status } = req.body;

  if (!studentId || !courseId || !sectionId || !semesterId || !date || !status) {
    return res.status(400).json({
      error: "studentId, courseId, sectionId, semesterId, date and status are required",
    });
  }

  const validStatuses = ["present", "absent", "late", "excused"];
  if (!validStatuses.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime()))
      return res.status(400).json({ error: "Invalid date" });
    // Normalize to midnight UTC
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Check if record exists
    const existing = await prisma.attendance.findFirst({
      where: { studentId, sectionId, date: attendanceDate },
    });

    let record;
    if (existing) {
      // Update existing record
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status, courseId },
        include: attendanceInclude,
      });
    } else {
      // Create new record
      record = await prisma.attendance.create({
        data: {
          studentId,
          courseId,
          sectionId,
          semesterId,
          date: attendanceDate,
          status,
        },
        include: attendanceInclude,
      });
    }

    return res.status(201).json(record);
  } catch (err) {
    console.error("markAttendance error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/attendance/bulk:
 *   post:
 *     summary: Mark attendance for multiple students at once
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [courseId, sectionId, semesterId, date, records]
 *             properties:
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [studentId, status]
 *                   properties:
 *                     studentId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [present, absent, late, excused]
 *     responses:
 *       201:
 *         description: Attendance records created/updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkAttendanceResponse'
 */
export const markBulkAttendance = async (req, res) => {
  const { courseId, sectionId, semesterId, date, records } = req.body;

  if (
    !courseId ||
    !sectionId ||
    !semesterId ||
    !date ||
    !Array.isArray(records) ||
    records.length === 0
  ) {
    return res.status(400).json({
      error: "courseId, sectionId, semesterId, date and records[] are required",
    });
  }

  const validStatuses = ["present", "absent", "late", "excused"];
  for (const r of records) {
    if (!r.studentId) {
      return res.status(400).json({ error: "Each record must have studentId" });
    }
    // Allow null/undefined status OR valid status values (no auto-default)
    if (r.status && !validStatuses.includes(r.status)) {
      return res.status(400).json({
        error: `status must be one of: ${validStatuses.join(", ")} or null`,
      });
    }
  }

  try {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime()))
      return res.status(400).json({ error: "Invalid date" });
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Filter: only process records with valid status (skip null/undefined)
    const recordsWithStatus = records.filter((r) => r.status);

    if (recordsWithStatus.length === 0) {
      // No records to save - return success with 0 count
      return res.status(201).json({
        message: "0 attendance records saved (all records had empty status)",
        date: attendanceDate,
        courseId,
        sectionId,
      });
    }

    // Upsert pattern: For each record, create or update individually (DON'T delete others)
    let updatedCount = 0;
    let createdCount = 0;

    for (const r of recordsWithStatus) {
      const existing = await prisma.attendance.findFirst({
        where: {
          studentId: r.studentId,
          courseId,
          sectionId,
          date: attendanceDate,
        },
      });

      if (existing) {
        // Update existing record
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { status: r.status },
        });
        updatedCount++;
      } else {
        // Create new record
        await prisma.attendance.create({
          data: {
            studentId: r.studentId,
            courseId,
            sectionId,
            semesterId,
            date: attendanceDate,
            status: r.status,
          },
        });
        createdCount++;
      }
    }

    return res.status(201).json({
      message: `${createdCount} attendance records created, ${updatedCount} updated`,
      date: attendanceDate,
      courseId,
      sectionId,
      created: createdCount,
      updated: updatedCount,
    });
  } catch (err) {
    console.error("markBulkAttendance error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/attendance/{id}:
 *   put:
 *     summary: Update an attendance record status
 *     tags: [Attendance]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [present, absent, late, excused]
 *     responses:
 *       200:
 *         description: Updated record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecord'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const updateAttendance = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["present", "absent", "late", "excused"];
  if (!status || !validStatuses.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    const existing = await prisma.attendance.findUnique({
      where: { id: req.params.id },
    });
    if (!existing)
      return res.status(404).json({ error: "Attendance record not found" });

    const record = await prisma.attendance.update({
      where: { id: req.params.id },
      data: { status },
      include: attendanceInclude,
    });
    return res.json(record);
  } catch (err) {
    console.error("updateAttendance error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/attendance/{id}:
 *   delete:
 *     summary: Delete an attendance record
 *     tags: [Attendance]
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
export const deleteAttendance = async (req, res) => {
  try {
    const existing = await prisma.attendance.findUnique({
      where: { id: req.params.id },
    });
    if (!existing)
      return res.status(404).json({ error: "Attendance record not found" });

    await prisma.attendance.delete({ where: { id: req.params.id } });
    return res.json({ message: "Attendance record deleted" });
  } catch (err) {
    console.error("deleteAttendance error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/attendance/report/course/{courseId}/section/{sectionId}:
 *   get:
 *     summary: Get monthly attendance report for a course-section
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Month (1-12)
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer, minimum: 2000 }
 *         description: Year (e.g., 2026)
 *     responses:
 *       200:
 *         description: Monthly attendance report with per-student summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                 section:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                 month:
 *                   type: integer
 *                 year:
 *                   type: integer
 *                 totalStudents:
 *                   type: integer
 *                 reportDate:
 *                   type: string
 *                   format: date-time
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       studentId:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       studentNumber:
 *                         type: string
 *                       summary:
 *                         type: object
 *                         properties:
 *                           present:
 *                             type: integer
 *                           absent:
 *                             type: integer
 *                           late:
 *                             type: integer
 *                           excused:
 *                             type: integer
 *                           totalDays:
 *                             type: integer
 *                           attendancePercentage:
 *                             type: number
 *                       records:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             date:
 *                               type: string
 *                               format: date
 *                             status:
 *                               type: string
 *                               enum: [present, absent, late, excused]
 *       400:
 *         description: Invalid month/year or missing parameters
 *       404:
 *         description: Course or section not found
 */
export const getMonthlyAttendanceReport = async (req, res) => {
  const { courseId, sectionId } = req.params;
  const { month, year } = req.query;

  // Validation
  if (!month || !year) {
    return res
      .status(400)
      .json({ error: "month and year query parameters are required" });
  }

  const monthNum = Number(month);
  const yearNum = Number(year);

  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ error: "month must be between 1 and 12" });
  }

  if (isNaN(yearNum) || yearNum < 2000) {
    return res.status(400).json({ error: "year must be a valid number >= 2000" });
  }

  if (!courseId || !sectionId) {
    return res
      .status(400)
      .json({ error: "courseId and sectionId are required" });
  }

  try {
    // Verify course and section exist
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true, name: true, courseId: true },
    });

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Verify section belongs to course
    if (section.courseId !== courseId) {
      return res
        .status(400)
        .json({ error: "Section does not belong to the specified course" });
    }

    // Get all students enrolled in this section
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
          },
        },
      },
    });

    if (enrollments.length === 0) {
      return res.json({
        course,
        section,
        month: monthNum,
        year: yearNum,
        totalStudents: 0,
        reportDate: new Date().toISOString(),
        students: [],
        message: "No students enrolled in this section",
      });
    }

    const studentIds = enrollments.map((e) => e.student.id);

    // Calculate date range for the month using UTC to avoid timezone issues
    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

    // Fetch all attendance records for these students in the month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        sectionId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: "asc" }],
    });

    // Group attendance by student
    const studentAttendanceMap = new Map();
    attendanceRecords.forEach((record) => {
      if (!studentAttendanceMap.has(record.studentId)) {
        studentAttendanceMap.set(record.studentId, []);
      }
      studentAttendanceMap.get(record.studentId).push(record);
    });

    // Build detailed student report
    const students = enrollments.map((enrollment) => {
      const studentId = enrollment.student.id;
      const records = studentAttendanceMap.get(studentId) || [];

      // Calculate summary
      const summary = {
        present: records.filter((r) => r.status === "present").length,
        absent: records.filter((r) => r.status === "absent").length,
        late: records.filter((r) => r.status === "late").length,
        excused: records.filter((r) => r.status === "excused").length,
        totalDays: records.length,
      };

      // Calculate attendance percentage (present + late = present, rest = absent)
      const effectivePresent = summary.present + summary.late;
      const attendancePercentage =
        summary.totalDays > 0
          ? Number(((effectivePresent / summary.totalDays) * 100).toFixed(2))
          : 0;

      return {
        studentId: enrollment.student.id,
        studentNumber: enrollment.student.studentId,
        fullName: enrollment.student.fullName,
        summary: {
          ...summary,
          attendancePercentage,
        },
        records: records.map((r) => ({
          id: r.id,
          date: r.date.toISOString().split("T")[0], // YYYY-MM-DD
          status: r.status,
        })),
      };
    });

    // Sort by student name
    students.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Calculate overall statistics
    const overallStats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    students.forEach((student) => {
      overallStats.present += student.summary.present;
      overallStats.absent += student.summary.absent;
      overallStats.late += student.summary.late;
      overallStats.excused += student.summary.excused;
    });

    return res.json({
      course,
      section,
      month: monthNum,
      year: yearNum,
      monthName: new Date(yearNum, monthNum - 1).toLocaleString("en-US", {
        month: "long",
      }),
      totalStudents: students.length,
      reportDate: new Date().toISOString(),
      overallStatistics: overallStats,
      students,
    });
  } catch (err) {
    console.error("getMonthlyAttendanceReport error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
