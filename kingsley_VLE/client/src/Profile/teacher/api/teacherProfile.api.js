import api from '../../../lib/api'

export const teacherProfileApi = {
  get: () => api.get('/users/profile'),
  update: (data) => api.put('/users/profile', data),
}
