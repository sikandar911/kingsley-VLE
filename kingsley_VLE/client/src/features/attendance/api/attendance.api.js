import api from "../../../lib/api";

export const attendanceApi = {
  // Get all attendance records with optional filters
  getAll: (params = {}) => api.get("/attendance", { params }),
  list: (params = {}) => api.get("/attendance", { params }),

  // Get a single attendance record by ID
  getById: (id) => api.get(`/attendance/${id}`),

  // Create a single attendance record
  create: (data) => api.post("/attendance", data),

  // Create bulk attendance records
  createBulk: (data) => api.post("/attendance/bulk", data),

  // Update an attendance record
  update: (id, data) => api.put(`/attendance/${id}`, data),

  // Delete an attendance record
  delete: (id) => api.delete(`/attendance/${id}`),
  remove: (id) => api.delete(`/attendance/${id}`),

  // Get enrollments with optional filters (semesterId, courseId, sectionId)
  getEnrollments: (params = {}) => api.get("/enrollments", { params }),

  // Get all sessions for dropdown
  getSessions: () => api.get("/sessions"),

  // Get all courses for dropdown
  getCourses: () => api.get("/courses"),

  // Get sections with optional filters (by courseId)
  getSections: (params = {}) => api.get("/sections", { params }),

  // Get semesters with optional filters (by courseId)
  getSemesters: (params = {}) => api.get("/semesters", { params }),
};
