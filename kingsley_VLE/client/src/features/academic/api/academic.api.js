import api from '../../../lib/api'

export const academicApi = {
  sessions: {
    list: (params = {}) => api.get('/sessions', { params }),
    getById: (id) => api.get(`/sessions/${id}`),
    create: (data) => api.post('/sessions', data),
    update: (id, data) => api.put(`/sessions/${id}`, data),
    delete: (id) => api.delete(`/sessions/${id}`),
  },
  semesters: {
    list: (params = {}) => api.get('/semesters', { params }),
    getById: (id) => api.get(`/semesters/${id}`),
    create: (data) => api.post('/semesters', data),
    update: (id, data) => api.put(`/semesters/${id}`, data),
    delete: (id) => api.delete(`/semesters/${id}`),
  },
}
