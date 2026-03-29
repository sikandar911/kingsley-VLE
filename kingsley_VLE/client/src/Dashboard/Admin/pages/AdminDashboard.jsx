import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { adminApi } from '../api/admin.api'
import CreateUserModal from '../components/CreateUserModal'
import UserTable from '../components/UserTable'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('student')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalCourses: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminApi.listUsers(tab),
        adminApi.getStats(),
      ])
      setUsers(usersRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleEdit = (u) => { setEditUser(u); setShowModal(true) }
  const handleCreate = () => { setEditUser(null); setShowModal(true) }

  const filteredUsers = users.filter((u) => {
    const profile = u.studentProfile || u.teacherProfile
    const name = profile?.fullName || ''
    const s = search.toLowerCase()
    return name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.username || '').toLowerCase().includes(s)
  })

  const adminName = user?.email?.split('@')[0]

  return (
    <div className="px-4 py-4 md:px-4 lg:px-8  lg:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello <span className="text-brand-700">{adminName},</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage student and teacher accounts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 md:mb-8">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: '🎓', bg: 'bg-blue-50' },
          { label: 'Total Teachers', value: stats.totalTeachers, icon: '👨\u200d🏫', bg: 'bg-green-50' },
          { label: 'Total Courses',  value: stats.totalCourses,  icon: '📚', bg: 'bg-orange-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 md:p-3 lg:p-5 flex items-center gap-4 shadow-sm border border-gray-100">
            <div className={`${s.bg} w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className=" flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-4 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {['student', 'teacher'].map((r) => (
              <button
                key={r}
                onClick={() => setTab(r)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition border-0 cursor-pointer ${
                  tab === r ? 'bg-white text-brand-700 shadow-sm font-semibold' : 'bg-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {r === 'student' ? '🎓 Students' : '👨\u200d🏫 Teachers'}
              </button>
            ))}
          </div>
          <div className="md:flex items-center md:gap-14 lg:gap-3">
            <input
              type="text"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 w-full md:w-56"
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-primary mt-3 md:mt-0" onClick={handleCreate}>+ Create Account</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : (
          <UserTable users={filteredUsers} onEdit={handleEdit} onRefresh={fetchUsers} />
        )}
      </div>

      {showModal && (
        <CreateUserModal
          onClose={() => { setShowModal(false); setEditUser(null) }}
          onCreated={fetchUsers}
          editUser={editUser}
        />
      )}
    </div>
  )
}

