import api from "../../../lib/api";

export const classRecordsApi = {
  list: (params = {}) => api.get("/class-records", { params }),
  getById: (id) => api.get(`/class-records/${id}`),
  create: (data) => api.post("/class-records", data),
  update: (id, data) => api.put(`/class-records/${id}`, data),
  delete: (id) => api.delete(`/class-records/${id}`),
  getCourses: () => api.get("/courses"),
  getSections: (params = {}) => api.get("/sections", { params }),
  getSemesters: (params = {}) => api.get("/semesters", { params }),
  // Upload a file to /files and return the azure fileUrl for storing in url field
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "class_record");
    return api.post("/files", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
