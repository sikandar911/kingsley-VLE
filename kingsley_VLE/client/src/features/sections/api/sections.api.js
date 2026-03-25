import api from '../../../lib/api'

export const sectionsApi = {
  list: (params = {}) => api.get('/sections', { params }),
  getById: (id) => api.get(`/sections/${id}`),
  create: (data) => api.post('/sections', data),
  update: (id, data) => api.put(`/sections/${id}`, data),
  delete: (id) => api.delete(`/sections/${id}`),
}
