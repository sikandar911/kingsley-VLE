import api from '../../../lib/api'

export const studentProfileApi = {
  get: () => api.get('/users/profile'),
  update: (data) => api.put('/users/profile', data),
}
