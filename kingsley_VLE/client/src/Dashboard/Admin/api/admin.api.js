import api from '../../../lib/api'

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  listUsers: (role) => api.get('/admin/users', { params: role ? { role } : {} }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
}
