import { useState } from 'react'
import { adminApi } from '../api/admin.api'

export default function UserTable({ users, onEdit, onRefresh }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (user) => {
    const name = user.studentProfile?.fullName || user.teacherProfile?.fullName || user.email
    if (!window.confirm(`Delete ${name}?`)) return
    setDeletingId(user.id)
    try {
      await adminApi.deleteUser(user.id)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (user) => {
    try {
      await adminApi.updateUser(user.id, { isActive: !user.isActive })
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed')
    }
  }

  if (!users.length) {
    return <div className="text-center py-12 text-sm text-gray-400">No users found. Create one to get started.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {['Name', 'Email', 'Username', 'ID', 'Status', 'Created', 'Actions'].map((h) => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const profile = user.studentProfile || user.teacherProfile
            const uid = profile?.studentId || profile?.teacherId || '—'
            return (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                <td className="px-5 py-3.5 font-medium text-gray-900">{profile?.fullName || '—'}</td>
                <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
                <td className="px-5 py-3.5 text-gray-500">{user.username || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded-full">{uid}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(user)} className="p-1.5 rounded-md hover:bg-gray-100 transition text-base border-0 bg-transparent cursor-pointer" title="Edit">✏️</button>
                    <button onClick={() => handleToggle(user)} className="p-1.5 rounded-md hover:bg-gray-100 transition text-base border-0 bg-transparent cursor-pointer" title={user.isActive ? 'Deactivate' : 'Activate'}>
                      {user.isActive ? '🔒' : '🔓'}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      className="p-1.5 rounded-md hover:bg-red-50 transition text-base border-0 bg-transparent cursor-pointer disabled:opacity-50"
                      title="Delete"
                    >🗑️</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
