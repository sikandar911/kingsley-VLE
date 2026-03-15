import api from '../../../lib/api'

export const assignmentsApi = {
  getMeta: () => api.get('/assignments/meta'),
  list: (params = {}) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  updateStatus: (id, status) => api.patch(`/assignments/${id}/status`, { status }),

  getSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),
  submit: (assignmentId, data) => api.post(`/assignments/${assignmentId}/submissions`, data),
  grade: (submissionId, data) =>
    api.patch(`/assignments/submissions/${submissionId}/grade`, data),
}
