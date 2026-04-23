import api from "../../../lib/api";

export const courseModulesApi = {
  list: (params = {}) => api.get("/course-modules", { params }),
  getById: (id) => api.get(`/course-modules/${id}`),
  create: (data) => api.post("/course-modules", data),
  update: (id, data) => api.put(`/course-modules/${id}`, data),
  delete: (id) => api.delete(`/course-modules/${id}`),
  getCourse: (courseId) => api.get(`/courses/${courseId}`),
  getSemestersForCourse: async (courseId) => {
    const [courseRes, semestersRes] = await Promise.all([
      api.get(`/courses/${courseId}`),
      api.get("/semesters"),
    ]);

    const course = courseRes.data || null;
    const allSemesters = Array.isArray(semestersRes.data)
      ? semestersRes.data
      : semestersRes.data?.data || [];

    const courseSemesterId = course?.semester?.id || course?.semesterId || null;
    const semesters = courseSemesterId
      ? allSemesters.filter((semester) => semester.id === courseSemesterId)
      : [];

    return {
      course,
      semesters,
      courseSemesterId,
    };
  },
};
