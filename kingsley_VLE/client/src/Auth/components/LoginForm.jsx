import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const roleHome = {
  admin: '/admin/dashboard',
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
}

export default function LoginForm() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(identifier, password)
      navigate(roleHome[user.role] || '/login', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-7 text-center">
        <h1 className="text-3xl font-extrabold text-brand-700">Kingsley Institute of Management - VLE</h1>
        <p className="text-gray-500 text-sm mt-1.5">Sign in to your account</p>
      </div>

      {error && (
        <div className="login-error">{error}</div>
      )}

      <div className="form-group">
        <label htmlFor="identifier" className="form-label">Email or Username</label>
        <input
          id="identifier"
          type="text"
          className="form-input"
          placeholder="Enter email or username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Password</label>
        <input
          id="password"
          type="password"
          className="form-input"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="btn-primary btn-full mt-2" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
