import axios from 'axios'

const fallbackApiUrl = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: fallbackApiUrl,
})

export async function initializeApiBaseUrl() {
  const runtimeConfigPaths = ['/api/config']

  if (import.meta.env.VITE_API_URL) {
    runtimeConfigPaths.push(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/config`)
  }

  for (const configUrl of runtimeConfigPaths) {
    try {
      const response = await fetch(configUrl, {
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        continue
      }

      const config = await response.json()

      if (config?.apiUrl) {
        api.defaults.baseURL = config.apiUrl
        return config.apiUrl
      }
    } catch {
      // Fall through to the next runtime config source or the env fallback.
    }
  }

  api.defaults.baseURL = fallbackApiUrl
  return fallbackApiUrl
}

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
