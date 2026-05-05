import api from '../../../lib/api'

export const assignmentsApi = {
  getMeta: () => api.get('/assignments/meta'),
  list: (params = {}) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  updateStatus: (id, status) => api.patch(`/assignments/${id}/status`, { status }),

  // Returns student's own submission (parent + attempts) or all submissions for admin/teacher
  getSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),
  submit: (assignmentId, data) => api.post(`/assignments/${assignmentId}/submissions`, data),
  // Update a specific attempt (by attemptId)
  updateSubmission: (attemptId, data) => api.patch(`/assignments/submissions/${attemptId}`, data),
  grade: (submissionId, data) =>
    api.patch(`/assignments/submissions/${submissionId}/grade`, data),

  // IQA / EQA workflow
  reviewAttempt: (attemptId, data) =>
    api.patch(`/assignments/attempts/${attemptId}/feedback`, data),
  qualifyAttempt: (attemptId) =>
    api.patch(`/assignments/attempts/${attemptId}/qualify`),
  studentSelectAttempt: (attemptId) =>
    api.patch(`/assignments/attempts/${attemptId}/student-select`),
  deleteAttempt: (attemptId) =>
    api.delete(`/assignments/attempts/${attemptId}`),

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
