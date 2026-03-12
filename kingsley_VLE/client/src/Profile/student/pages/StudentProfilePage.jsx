import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { studentProfileApi } from '../api/studentProfile.api'

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent transition'

export default function StudentProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    address: '',
    bio: '',
    bloodGroup: '',
    dateOfBirth: '',
    educationBackground: '',
    admissionStatus: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const p = user?.studentProfile
    if (p) {
      setForm({
        fullName: p.fullName || '',
        username: user.username || '',
        phone: p.phone || '',
        address: p.address || '',
        bio: p.bio || '',
        bloodGroup: p.bloodGroup || '',
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
        educationBackground: p.educationBackground || '',
        admissionStatus: p.admissionStatus || '',
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
      const payload = { ...form }
      if (!payload.password) delete payload.password
      const res = await studentProfileApi.update(payload)
      updateUser(res.data)
      setSuccess('Profile updated successfully!')
      setForm((prev) => ({ ...prev, password: '' }))
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed.')
    } finally {
      setLoading(false)
    }
  }

  const profile = user?.studentProfile

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
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
            {profile?.studentId}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg text-sm">{success}</div>}

        <h3 className="text-base font-semibold text-gray-800 pb-2 border-b border-gray-100">Personal Info</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input name="phone" className={input} value={form.phone} onChange={set} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input name="dateOfBirth" type="date" className={input} value={form.dateOfBirth} onChange={set} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
            <input name="bloodGroup" className={input} value={form.bloodGroup} onChange={set} placeholder="e.g. A+" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Status</label>
            <input name="admissionStatus" className={input} value={form.admissionStatus} onChange={set} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea name="address" className={`${input} resize-none`} rows={2} value={form.address} onChange={set} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea name="bio" className={`${input} resize-none`} rows={3} value={form.bio} onChange={set} placeholder="Tell something about yourself..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Education Background</label>
          <textarea name="educationBackground" className={`${input} resize-none`} rows={2} value={form.educationBackground} onChange={set} />
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
