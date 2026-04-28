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
const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://classroom.kingsleyinstitute.com',
  ...configuredOrigins,
];

app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}))
app.use(express.json())

// Swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/config", (req, res) => {
  const backendOrigin = process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;

  res.json({
    apiUrl: `${backendOrigin.replace(/\/$/, "")}/api`,
  });
});

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
app.listen(PORT, () => {
  const apiUrl = process.env.NODE_ENV === 'production'
    ? process.env.BACKEND_URL || `http://localhost:${PORT}`
    : `http://localhost:${PORT}`
    
  console.log(`\n🚀 Server running at ${apiUrl}`)
  console.log(`📚 Swagger docs at ${apiUrl}/api/docs\n`)
})

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
