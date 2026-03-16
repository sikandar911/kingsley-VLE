import { useAuth } from '../../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const profile = user?.teacherProfile
  const name = profile?.fullName || user?.email

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello <span className="text-brand-700">{name},</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to your teacher portal</p>
      </div>

      <div className="grid md:grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6 md:mb-8">
        {[
          { label: 'Teacher ID', value: profile?.teacherId || '—', icon: '🪪' },
          { label: 'Specialization', value: profile?.specialization || '—', icon: '🎯' },
          { label: 'Experience', value: profile?.experienceYears ? `${profile.experienceYears} yrs` : '—', icon: '📅' },
          { label: 'Courses', value: '—', icon: '📚' },
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

      {!profile?.description && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 md:flex items-center justify-between md:gap-2">
          <div className='mb-4 md:mb-0'>
            <p className="font-semibold text-brand-700">Complete your profile</p>
            <p className="text-sm text-brand-600 mt-0.5">Add your bio, specialization and experience to your profile.</p>
          </div>
          <Link to="/teacher/profile" className="btn-primary text-sm whitespace-nowrap">
            Update Profile →
          </Link>
        </div>
      )}
    </div>
  )
}
