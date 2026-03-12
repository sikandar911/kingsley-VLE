import { useAuth } from '../../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function StudentDashboard() {
  const { user } = useAuth()
  const profile = user?.studentProfile
  const name = profile?.fullName || user?.email

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello <span className="text-brand-700">{name},</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to your student portal</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Student ID', value: profile?.studentId || '—', icon: '🪪' },
          { label: 'Status', value: profile?.admissionStatus || 'Active', icon: '✅' },
          { label: 'Courses', value: '—', icon: '📚' },
          { label: 'Assignments', value: '—', icon: '📋' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="font-semibold text-gray-900 text-sm">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Profile completion prompt */}
      {!profile?.phone && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-brand-700">Complete your profile</p>
            <p className="text-sm text-brand-600 mt-0.5">Add your phone, address and other details to your profile.</p>
          </div>
          <Link to="/student/profile" className="btn-primary text-sm whitespace-nowrap">
            Update Profile →
          </Link>
        </div>
      )}
    </div>
  )
}
