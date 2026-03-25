import api from '../../../lib/api'

export const enrollmentsApi = {
  list: (params = {}) => api.get('/enrollments', { params }),
  getById: (id) => api.get(`/enrollments/${id}`),
  create: (data) => api.post('/enrollments', data),
  delete: (id) => api.delete(`/enrollments/${id}`),
  teachers: {
    list: (params = {}) => api.get('/enrollments/teachers', { params }),
    create: (data) => api.post('/enrollments/teachers', data),
    delete: (id) => api.delete(`/enrollments/teachers/${id}`),
  },
}
