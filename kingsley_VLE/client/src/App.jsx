import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import DashboardLayout from './components/Layout/DashboardLayout'
import LoginPage from './Auth/pages/LoginPage'
import AdminDashboard from './Dashboard/Admin/pages/AdminDashboard'
import StudentDashboard from './Dashboard/Student/pages/StudentDashboard'
import TeacherDashboard from './Dashboard/Teacher/pages/TeacherDashboard'
import StudentProfilePage from './Profile/student/pages/StudentProfilePage'
import TeacherProfilePage from './Profile/teacher/pages/TeacherProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Student */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/profile" element={<StudentProfilePage />} />
            </Route>
          </Route>

          {/* Teacher */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/profile" element={<TeacherProfilePage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
