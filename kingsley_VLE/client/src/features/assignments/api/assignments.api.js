import api from '../../../lib/api'

export const assignmentsApi = {
  getMeta: () => api.get('/assignments/meta'),
  list: (params = {}) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  updateStatus: (id, status) => api.patch(`/assignments/${id}/status`, { status }),

  // Returns student's own submissions (student role) or all submissions (admin/teacher)
  getSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),
  submit: (assignmentId, data) => api.post(`/assignments/${assignmentId}/submissions`, data),
  updateSubmission: (submissionId, data) => api.patch(`/assignments/submissions/${submissionId}`, data),
  grade: (submissionId, data) =>
    api.patch(`/assignments/submissions/${submissionId}/grade`, data),

  // Upload a file and return the File record {id, name, fileUrl, ...}
  uploadFile: (file, fileType = 'assignment') => {
    const form = new FormData()
    form.append('file', file)
    form.append('fileType', fileType)
    return api.post('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Get a secure download/view URL for a file
  getSecureUrl: (fileId) => api.get(`/files/${fileId}/secure-url`),
}
