import api from '../../lib/api'

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  getMe: () => api.get('/auth/me'),
}
