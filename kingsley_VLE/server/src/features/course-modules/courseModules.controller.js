import prisma from "../../config/prisma.js";

const moduleInclude = {
  course: { select: { id: true, title: true } },
  section: { select: { id: true, name: true } },
  semester: { select: { id: true, name: true, year: true } },
};

/**
 * @swagger
 * /api/course-modules:
 *   get:
 *     summary: List all course modules with optional filtering
 *     description: Retrieve all course modules with pagination and filtering by courseId, sectionId, semesterId, status, or search term
 *     tags: [CourseModules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: string
 *         description: Filter by section ID
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: string
 *         description: Filter by semester ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by module status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by module name (case-insensitive)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of course modules with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseModuleListResponse'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create a new course module
 *     description: Create a new module within a course. Requires admin or teacher role.
 *     tags: [CourseModules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - courseId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Module 1: Introduction"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Introduction to course concepts
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *               courseId:
 *                 type: string
 *                 description: Required - ID of the course this module belongs to
 *               sectionId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional - ID of the specific section
 *               semesterId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional - ID of the semester
 *     responses:
 *       201:
 *         description: Course module created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseModule'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - only admin and teacher roles are allowed
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// ── List ─────────────────────────────────────────────────────────────────────
export const listCourseModules = async (req, res) => {
  const {
    courseId,
    sectionId,
    semesterId,
    status,
    search,
    page = 1,
    limit = 50,
  } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (courseId) where.courseId = courseId;
  if (sectionId) where.sectionId = sectionId;
  if (semesterId) where.semesterId = semesterId;
  if (status) where.status = status;
  if (search) where.name = { contains: search, mode: "insensitive" };

  try {
    const [modules, total] = await Promise.all([
      prisma.courseModule.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: moduleInclude,
      }),
      prisma.courseModule.count({ where }),
    ]);
    return res.json({
      modules,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error("listCourseModules error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * @swagger
 * /api/course-modules/{id}:
 *   get:
 *     summary: Get a specific course module by ID
 *     tags: [CourseModules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course module ID
 *     responses:
 *       200:
 *         description: Course module details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseModule'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       404:
 *         description: Course module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update a course module
 *     description: Update an existing course module. Only specified fields will be updated. Requires admin or teacher role.
 *     tags: [CourseModules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Module 1: Updated Title"
 *               description:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               sectionId:
 *                 type: string
 *                 nullable: true
 *               semesterId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Course module updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseModule'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - only admin and teacher roles are allowed
 *       404:
 *         description: Course module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete a course module
 *     description: Permanently delete a course module. Requires admin or teacher role.
 *     tags: [CourseModules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course module ID
 *     responses:
 *       200:
 *         description: Course module deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Course module deleted
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - only admin and teacher roles are allowed
 *       404:
 *         description: Course module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// ── Get by ID ─────────────────────────────────────────────────────────────────
export const getCourseModule = async (req, res) => {
  try {
    const mod = await prisma.courseModule.findUnique({
      where: { id: req.params.id },
      include: moduleInclude,
    });
    if (!mod) return res.status(404).json({ error: "Course module not found" });
    return res.json(mod);
  } catch (err) {
    console.error("getCourseModule error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── Create ────────────────────────────────────────────────────────────────────
export const createCourseModule = async (req, res) => {
  const {
    name,
    description,
    status = "active",
    courseId,
    sectionId,
    semesterId,
  } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  if (!courseId) return res.status(400).json({ error: "courseId is required" });
  if (status && !["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "status must be active or inactive" });
  }

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(400).json({ error: "Course not found" });

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
    });
    return res.status(201).json(mod);
  } catch (err) {
    console.error("createCourseModule error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── Update ────────────────────────────────────────────────────────────────────
export const updateCourseModule = async (req, res) => {
  const { name, description, status, sectionId, semesterId } = req.body;

  if (status && !["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "status must be active or inactive" });
  }

  try {
    const existing = await prisma.courseModule.findUnique({
      where: { id: req.params.id },
    });
    if (!existing)
      return res.status(404).json({ error: "Course module not found" });

    const mod = await prisma.courseModule.update({
      where: { id: req.params.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(description !== undefined
          ? { description: description || null }
          : {}),
        ...(status ? { status } : {}),
        ...(sectionId !== undefined ? { sectionId: sectionId || null } : {}),
        ...(semesterId !== undefined ? { semesterId: semesterId || null } : {}),
      },
      include: moduleInclude,
    });
    return res.json(mod);
  } catch (err) {
    console.error("updateCourseModule error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteCourseModule = async (req, res) => {
  try {
    const existing = await prisma.courseModule.findUnique({
      where: { id: req.params.id },
    });
    if (!existing)
      return res.status(404).json({ error: "Course module not found" });

    await prisma.courseModule.delete({ where: { id: req.params.id } });
    return res.json({ message: "Course module deleted" });
  } catch (err) {
    console.error("deleteCourseModule error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
