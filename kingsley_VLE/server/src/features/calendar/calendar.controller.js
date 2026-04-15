import prisma from "../../config/prisma.js";

/**
 * @swagger
 * tags:
 *   name: Calendar
 *   description: Calendar reminders – date-based highlights for assignments and events
 */

const reminderInclude = {
  event: {
    select: {
      id: true,
      title: true,
      type: true,
      startTime: true,
      endTime: true,
      color: true,
    },
  },
  assignment: {
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true,
      totalMarks: true,
      course: { select: { id: true, title: true } },
      section: { select: { id: true, name: true } },
    },
  },
  course: { select: { id: true, title: true } },
  section: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true, year: true } },
  createdByUser: { select: { id: true, email: true, role: true } },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Build the role-aware base filter so students only see relevant reminders. */
const buildAccessWhere = async (user) => {
  if (user.role === "admin") return {};

  if (user.role === "teacher") {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: {
        assignedCourses: { select: { courseId: true, sectionId: true } },
      },
    });
    if (!teacher) return { id: "none" };

    const courseIds = teacher.assignedCourses.map((c) => c.courseId);
    const sectionIds = teacher.assignedCourses
      .filter((c) => c.sectionId)
      .map((c) => c.sectionId);

    return {
      OR: [
        { courseId: null, sectionId: null }, // institution-wide reminders
        { courseId: { in: courseIds } },
        ...(sectionIds.length > 0 ? [{ sectionId: { in: sectionIds } }] : []),
        { createdBy: user.id },
      ],
    };
  }

  // student
  const student = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { enrollments: { select: { courseId: true, sectionId: true } } },
  });
  if (!student) return { id: "none" };

  const courseIds = student.enrollments.map((e) => e.courseId);
  const sectionIds = student.enrollments
    .map((e) => e.sectionId)
    .filter(Boolean);

  return {
    OR: [
      { courseId: null, sectionId: null },
      { courseId: { in: courseIds } },
      ...(sectionIds.length > 0 ? [{ sectionId: { in: sectionIds } }] : []),
    ],
  };
};

const formatDateKey = (value) => {
  if (!value) return null;

  // For ISO strings with timezone info, extract date in UTC
  if (typeof value === "string" && value.includes("T")) {
    // Extract YYYY-MM-DD directly from ISO string (before timezone)
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  // Fallback for Date objects
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Use UTC methods to avoid timezone shifts
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getReminderDateKey = (reminder) =>
  formatDateKey(reminder.assignment?.dueDate) ||
  formatDateKey(reminder.event?.startTime) ||
  formatDateKey(reminder.date);

// ---------------------------------------------------------------------------
// GET REMINDERS (date range – for calendar view)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: Get calendar reminders within a date range
 *     description: Returns all reminders the current user can see. Use `from`/`to` to scope to a month view.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date }
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [assignment, event] }
 *       - in: query
 *         name: courseId
 *         schema: { type: string }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string }
 *       - in: query
 *         name: semesterId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of calendar reminders grouped by date
 */
export const getCalendarReminders = async (req, res) => {
  const { from, to, type, courseId, sectionId, semesterId } = req.query;

  if (!from || !to) {
    return res
      .status(400)
      .json({ error: "from and to query params are required" });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate) || isNaN(toDate)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  try {
    const accessWhere = await buildAccessWhere(req.user);

    const where = {
      AND: [accessWhere, { date: { gte: fromDate, lte: toDate } }],
    };

    if (type) where.AND.push({ type });
    if (courseId) where.AND.push({ courseId });
    if (sectionId) where.AND.push({ sectionId });
    if (semesterId) where.AND.push({ semesterId });

    const reminders = await prisma.calendarReminder.findMany({
      where,
      orderBy: { date: "asc" },
      include: reminderInclude,
    });

    // Filter out course-type events without a course assignment
    // Institution-type events are always shown (even if courseId is null)
    const filteredReminders = reminders.filter((reminder) => {
      if (reminder.type === "event" && reminder.event) {
        // If event is of type "course" but has no courseId, exclude it
        if (reminder.event.type === "course" && !reminder.courseId) {
          return false;
        }
      }
      return true;
    });

    const normalizedReminders = filteredReminders.map((reminder) => ({
      ...reminder,
      date: getReminderDateKey(reminder) || formatDateKey(reminder.date),
    }));

    // Group by date string for easy calendar rendering
    const grouped = normalizedReminders.reduce((acc, r) => {
      const key = r.date;

      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});

    return res.json({ reminders: normalizedReminders, grouped });
  } catch (err) {
    console.error("getCalendarReminders error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// GET REMINDERS FOR A SPECIFIC DATE
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /api/calendar/{date}:
 *   get:
 *     summary: Get all reminders for a specific date
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Array of reminders for that date
 *       400:
 *         description: Invalid date
 */
export const getRemindersByDate = async (req, res) => {
  const { date } = req.params;
  const parsed = new Date(date);

  if (isNaN(parsed)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  // Match the full calendar day
  const dayStart = new Date(parsed);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(parsed);
  dayEnd.setHours(23, 59, 59, 999);

  try {
    const accessWhere = await buildAccessWhere(req.user);

    const reminders = await prisma.calendarReminder.findMany({
      where: {
        AND: [accessWhere, { date: { gte: dayStart, lte: dayEnd } }],
      },
      orderBy: { createdAt: "asc" },
      include: reminderInclude,
    });

    // Filter out course-type events without a course assignment
    // Institution-type events are always shown (even if courseId is null)
    const filteredReminders = reminders.filter((reminder) => {
      if (reminder.type === "event" && reminder.event) {
        // If event is of type "course" but has no courseId, exclude it
        if (reminder.event.type === "course" && !reminder.courseId) {
          return false;
        }
      }
      return true;
    });

    const normalizedReminders = filteredReminders.map((reminder) => ({
      ...reminder,
      date: getReminderDateKey(reminder) || formatDateKey(reminder.date),
    }));

    return res.json(normalizedReminders);
  } catch (err) {
    console.error("getRemindersByDate error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// CREATE REMINDER (manual)
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /api/calendar:
 *   post:
 *     summary: Manually create a calendar reminder
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, name, type]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: YYYY-MM-DD
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [assignment, event]
 *               eventId:
 *                 type: string
 *               assignmentId:
 *                 type: string
 *               courseId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               semesterId:
 *                 type: string
 *               targetRole:
 *                 type: string
 *                 enum: [admin, teacher, student]
 *                 description: Restrict visibility to a specific role (null = all)
 *     responses:
 *       201:
 *         description: Created reminder
 *       400:
 *         description: Validation error
 */
export const createReminder = async (req, res) => {
  const {
    date,
    name,
    type,
    eventId,
    assignmentId,
    courseId,
    sectionId,
    semesterId,
    targetRole,
  } = req.body;

  if (!date || !name || !type) {
    return res.status(400).json({ error: "date, name, and type are required" });
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  const validTypes = ["assignment", "event"];
  if (!validTypes.includes(type)) {
    return res
      .status(400)
      .json({ error: `type must be one of: ${validTypes.join(", ")}` });
  }

  const validRoles = ["admin", "teacher", "student"];
  if (targetRole && !validRoles.includes(targetRole)) {
    return res
      .status(400)
      .json({ error: `targetRole must be one of: ${validRoles.join(", ")}` });
  }

  try {
    // Validate referenced event/assignment exist
    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event)
        return res.status(400).json({ error: "Referenced event not found" });
    }

    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
      });
      if (!assignment)
        return res
          .status(400)
          .json({ error: "Referenced assignment not found" });
    }

    parsedDate.setHours(0, 0, 0, 0);

    const reminder = await prisma.calendarReminder.create({
      data: {
        date: parsedDate,
        name: name.trim(),
        type,
        eventId: eventId ?? null,
        assignmentId: assignmentId ?? null,
        courseId: courseId ?? null,
        sectionId: sectionId ?? null,
        semesterId: semesterId ?? null,
        targetRole: targetRole ?? null,
        createdBy: req.user.id,
        isAutoGenerated: false,
      },
      include: reminderInclude,
    });

    return res.status(201).json(reminder);
  } catch (err) {
    console.error("createReminder error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// UPDATE REMINDER
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /api/calendar/reminders/{id}:
 *   put:
 *     summary: Update a calendar reminder
 *     tags: [Calendar]
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
 *               date: { type: string, format: date }
 *               name: { type: string }
 *               targetRole: { type: string }
 *     responses:
 *       200:
 *         description: Updated reminder
 *       404:
 *         description: Not found
 */
export const updateReminder = async (req, res) => {
  const { id } = req.params;
  const { date, name, targetRole, courseId, sectionId, semesterId } = req.body;

  try {
    const existing = await prisma.calendarReminder.findUnique({
      where: { id },
    });
    if (!existing) return res.status(404).json({ error: "Reminder not found" });

    const data = {};
    if (date !== undefined) {
      const parsed = new Date(date);
      if (isNaN(parsed))
        return res.status(400).json({ error: "Invalid date format" });
      parsed.setHours(0, 0, 0, 0);
      data.date = parsed;
    }
    if (name !== undefined) data.name = name.trim();
    if (targetRole !== undefined) data.targetRole = targetRole ?? null;
    if (courseId !== undefined) data.courseId = courseId ?? null;
    if (sectionId !== undefined) data.sectionId = sectionId ?? null;
    if (semesterId !== undefined) data.semesterId = semesterId ?? null;

    const reminder = await prisma.calendarReminder.update({
      where: { id },
      data,
      include: reminderInclude,
    });

    return res.json(reminder);
  } catch (err) {
    console.error("updateReminder error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// DELETE REMINDER
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /api/calendar/reminders/{id}:
 *   delete:
 *     summary: Delete a calendar reminder
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
export const deleteReminder = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.calendarReminder.findUnique({
      where: { id },
    });
    if (!existing) return res.status(404).json({ error: "Reminder not found" });

    await prisma.calendarReminder.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error("deleteReminder error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
