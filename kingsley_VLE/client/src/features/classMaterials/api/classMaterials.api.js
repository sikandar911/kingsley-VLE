import api from "../../../lib/api";

export const classMaterialsApi = {
  // Get all class materials with optional filters
  list: (params = {}) => api.get("/class-materials", { params }),

  // Get a single class material by ID
  getById: (id) => api.get(`/class-materials/${id}`),

  // Create a new class material
  create: (data) => api.post("/class-materials", data),

  // Update a class material
  update: (id, data) => api.put(`/class-materials/${id}`, data),

  // Delete a class material
  delete: (id) => api.delete(`/class-materials/${id}`),

  // Get dropdown data (Courses, Sections, Semesters)
  getDropdownData: () => api.get("/class-materials/meta"),

  // Get all courses for dropdown
  getCourses: () => api.get("/courses"),

  // Get sections with optional filters (by courseId)
  getSections: (params = {}) => api.get("/sections", { params }),

  // Get semesters with optional filters (by courseId)
  getSemesters: (params = {}) => api.get("/semesters", { params }),

  // ── File Upload Functions ──
  // Upload a file for class materials
  // fileType defaults to "class_material"
  uploadFile: (file, fileType = "class_material") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", fileType);

    return api.post("/files", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Get all files with optional filters
  listFiles: (params = {}) => api.get("/files", { params }),

  // Get a single file by ID
  getFileById: (id) => api.get(`/files/${id}`),

  // Delete a file
  deleteFile: (id) => api.delete(`/files/${id}`),
};
