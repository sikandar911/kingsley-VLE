import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoginForm from '../components/LoginForm'

const roleHome = {
  admin: '/admin/dashboard',
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
}

export default function LoginPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={roleHome[user.role] || '/login'} replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-5">
      <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl">
        <LoginForm />
      </div>
    </div>
  )
}
