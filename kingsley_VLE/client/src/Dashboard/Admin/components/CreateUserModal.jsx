import { useState } from 'react'
import { adminApi } from '../api/admin.api'

const initialForm = {
  email: '', username: '', password: '', role: 'student',
  fullName: '', studentId: '', teacherId: '', phone: '', specialization: '',
}

export default function CreateUserModal({ onClose, onCreated, editUser }) {
  const isEdit = !!editUser
  const [form, setForm] = useState(
    isEdit
      ? {
          email: editUser.email || '',
          username: editUser.username || '',
          password: '',
          role: editUser.role || 'student',
          fullName: editUser.studentProfile?.fullName || editUser.teacherProfile?.fullName || '',
          phone: editUser.studentProfile?.phone || '',
          specialization: editUser.teacherProfile?.specialization || '',
          studentId: editUser.studentProfile?.studentId || '',
          teacherId: editUser.teacherProfile?.teacherId || '',
        }
      : { ...initialForm }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.username) delete payload.username
      if (!payload.password && isEdit) delete payload.password
      if (payload.role === 'student') { delete payload.teacherId; delete payload.specialization }
      else { delete payload.studentId; delete payload.phone }

      if (isEdit) await adminApi.updateUser(editUser.id, payload)
      else await adminApi.createUser(payload)
      onCreated()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setLoading(false)
    }
  }

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3.5 md:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit User' : 'Create New Account'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition border-0 bg-transparent cursor-pointer text-lg">
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input name="fullName" className={input} value={form.fullName} onChange={set} required placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select name="role" className={input} value={form.role} onChange={set} disabled={isEdit}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input name="email" type="email" className={input} value={form.email} onChange={set} required placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input name="username" className={input} value={form.username} onChange={set} placeholder="Optional" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? 'New Password (leave blank to keep)' : 'Password *'}
            </label>
            <input
              name="password" type="password" className={input}
              value={form.password} onChange={set}
              required={!isEdit}
              placeholder={isEdit ? 'Leave blank to keep current' : 'Password'}
            />
          </div>

          {form.role === 'student' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input name="studentId" className={input} value={form.studentId} onChange={set} placeholder="Auto-generated if blank" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input name="phone" className={input} value={form.phone} onChange={set} placeholder="Phone number" />
              </div>
            </div>
          )}

          {form.role === 'teacher' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher ID</label>
                <input name="teacherId" className={input} value={form.teacherId} onChange={set} placeholder="Auto-generated if blank" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <input name="specialization" className={input} value={form.specialization} onChange={set} placeholder="e.g. Mathematics" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
