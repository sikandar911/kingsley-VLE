import api from '../../../lib/api'

export const courseModulesApi = {
  list: (params = {}) => api.get('/course-modules', { params }),
  getById: (id) => api.get(`/course-modules/${id}`),
  create: (data) => api.post('/course-modules', data),
  update: (id, data) => api.put(`/course-modules/${id}`, data),
  delete: (id) => api.delete(`/course-modules/${id}`),
}
