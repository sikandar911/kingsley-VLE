import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { teacherProfileApi } from '../api/teacherProfile.api'

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition'

export default function TeacherProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    description: '',
    specialization: '',
    experienceYears: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const p = user?.teacherProfile
    if (p) {
      setForm({
        fullName: p.fullName || '',
        username: user.username || '',
        description: p.description || '',
        specialization: p.specialization || '',
        experienceYears: p.experienceYears ?? '',
        password: '',
      })
    }
  }, [user])

  const set = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
      }
      if (!payload.password) delete payload.password
      const res = await teacherProfileApi.update(payload)
      updateUser(res.data)
      setSuccess('Profile updated successfully!')
      setForm((prev) => ({ ...prev, password: '' }))
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed.')
    } finally {
      setLoading(false)
    }
  }

  const profile = user?.teacherProfile

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your professional information</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-brand-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {profile?.fullName?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{profile?.fullName}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className="inline-block mt-1 text-xs font-medium bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full">
            {profile?.teacherId}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">{success}</div>}

        <h3 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-100">Professional Info</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input name="fullName" className={input} value={form.fullName} onChange={set} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input name="username" className={input} value={form.username} onChange={set} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
            <input name="specialization" className={input} value={form.specialization} onChange={set} placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input name="experienceYears" type="number" min="0" className={input} value={form.experienceYears} onChange={set} placeholder="e.g. 5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Description</label>
          <textarea name="description" className={`${input} resize-none`} rows={4} value={form.description} onChange={set} placeholder="Tell students about yourself..." />
        </div>

        <h3 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-100 pt-2">Change Password</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input name="password" type="password" className={input} value={form.password} onChange={set} placeholder="Leave blank to keep current" />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary px-6" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
