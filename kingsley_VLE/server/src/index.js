import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger/swagger.js";
import authRoutes from "./features/auth/auth.routes.js";
import adminRoutes from "./features/admin/admin.routes.js";
import assignmentRoutes from "./features/assignments/assignments.routes.js";
import usersRoutes from "./features/users/users.routes.js";
import courseRoutes from "./features/courses/courses.routes.js";
import sectionRoutes from "./features/sections/sections.routes.js";
import academicRoutes from "./features/academic/academic.routes.js";
import enrollmentRoutes from "./features/enrollments/enrollments.routes.js";
import fileRoutes from "./features/files/files.routes.js";
import attendanceRoutes from "./features/attendance/attendance.routes.js";
import classMaterialRoutes from "./features/class-materials/classMaterials.routes.js";
import classRecordRoutes from "./features/class-records/classRecords.routes.js";
import eventRoutes from "./features/events/events.routes.js";
import calendarRoutes from "./features/calendar/calendar.routes.js";
import courseChatRoutes from "./features/course-chat/courseChat.routes.js";
import courseModuleRoutes from "./features/course-modules/courseModules.routes.js";
import prisma from "./config/prisma.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api", academicRoutes); // exposes /api/sessions and /api/semesters
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/class-materials", classMaterialRoutes);
app.use("/api/class-records", classRecordRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/course-chat", courseChatRoutes);
app.use("/api/course-modules", courseModuleRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  // console.log(`\n🚀 Server running at http://localhost:${PORT}`)
  // console.log(`📚 Swagger docs at http://localhost:${PORT}/api/docs\n`)
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
