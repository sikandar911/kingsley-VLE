import axios from 'axios'

// Use VITE_API_URL if it exists (for production), otherwise fallback to '/api' for local dev proxy
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vle_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vle_token')
      
      // Prevent full page reload if the 401 was a failed login attempt
      if (!error.config?.url?.includes('/auth/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
