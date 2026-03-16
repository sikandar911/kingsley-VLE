import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { assignmentsApi } from '../api/assignments.api'
import CreateAssignmentModal from '../components/CreateAssignmentModal'
import AssignmentPreviewModal from '../components/AssignmentPreviewModal'
import ViewSubmissionsModal from '../components/ViewSubmissionsModal'

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const statusBadge = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
}

export default function TeacherAssignmentsPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editAssignment, setEditAssignment] = useState(null)
  const [preview, setPreview] = useState(null)
  const [viewSubmissions, setViewSubmissions] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    assignmentsApi
      .list(filterStatus ? { status: filterStatus } : {})
      .then((res) => setAssignments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus])

  useEffect(() => {
    load()
  }, [load])

  const filtered = assignments.filter((a) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      a.title.toLowerCase().includes(q) ||
      a.course?.title.toLowerCase().includes(q) ||
      a.teacher?.fullName?.toLowerCase().includes(q)
    )
  })

  const totalSubmissions = assignments.reduce((s, a) => s + (a._count?.submissions || 0), 0)
  const published = assignments.filter((a) => a.status === 'published').length
  const draft = assignments.filter((a) => a.status === 'draft').length

  const stats = [
    { label: 'Total Assignments', value: assignments.length, icon: '📋', bg: 'bg-blue-50' },
    { label: 'Submissions', value: totalSubmissions, icon: '📥', bg: 'bg-green-50' },
    { label: 'Published', value: published, icon: '✅', bg: 'bg-purple-50' },
    { label: 'Drafts', value: draft, icon: '📝', bg: 'bg-orange-50' },
  ]

  const handleEdit = (assignment) => {
    setPreview(null)
    setEditAssignment(assignment)
    setShowCreate(true)
  }

  const handleStatusChange = async (assignment, newStatus) => {
    try {
      await assignmentsApi.updateStatus(assignment.id, newStatus)
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update status')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7F6] ">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 lg:py-6">
        <div className="lg:flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-gray-900">Assignment Management</h1>
            <p className="text-sm text-gray-500 mt-1">Assignments › List</p>
          </div>
          <button
            onClick={() => { setEditAssignment(null); setShowCreate(true) }}
            className="mt-2 lg:mt-0 px-3.5 md:px-6 py-2.5 bg-[#6b1142] text-[12.5px] md:text-[15px] lg:text-[15px] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition"
          >
            + Create New Assignment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 lg:px-8 lg:py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3.5 lg:gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm border border-gray-200"
          >
            <div
              className={`${s.bg} w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-8 pb-4 lg:pb-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, course, instructor…"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] bg-white"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-8 pb-4 md:pb-4  lg:pb-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-[#6b1142] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-5xl mb-3">📋</span>
              <p className="text-sm">
                {assignments.length === 0 ? 'No assignments yet' : 'No matching assignments'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      'Assignment',
                      'Course / Section',
                      'Deadline',
                      'Submissions',
                      'Status',
                      'Instructor',
                      'Actions',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a) => {
                    const subCount = a._count?.submissions || 0
                    const isOverdue = Boolean(a.dueDate && new Date() > new Date(a.dueDate))
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{a.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">
                            {a.targetType === 'section' ? 'Section assignment' : 'Individual'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-gray-800">{a.course?.title || '—'}</p>
                          {a.section && (
                            <p className="text-xs text-gray-500 mt-0.5">{a.section.name}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-400">Created: {fmt(a.createdAt)}</p>
                          {a.dueDate && (
                            <p className={`text-xs mt-0.5 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                              Due: {fmt(a.dueDate)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{subCount}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[a.status] || 'bg-gray-100 text-gray-500'}`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {a.teacher?.fullName || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {/* Preview */}
                            <button
                              onClick={() => setPreview(a)}
                              className="p-1.5 hover:bg-gray-100 rounded transition"
                              title="Preview"
                            >
                              <svg
                                className="w-5 h-5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleEdit(a)}
                              className="p-1.5 hover:bg-gray-100 rounded transition text-base"
                              title="Edit"
                            >
                              ✏️
                            </button>

                            {/* View Submissions */}
                            <button
                              onClick={() => setViewSubmissions(a)}
                              className="p-1.5 hover:bg-blue-50 rounded transition text-base"
                              title="View Submissions"
                            >
                              📋
                            </button>

                            {/* Publish (only if draft) */}
                            {a.status === 'draft' && (
                              <button
                                onClick={() => handleStatusChange(a, 'published')}
                                className="p-1.5 hover:bg-green-50 rounded transition text-base"
                                title="Publish"
                              >
                                🟢
                              </button>
                            )}

                            {/* Close (only if published) */}
                            {a.status === 'published' && (
                              <button
                                onClick={() => handleStatusChange(a, 'closed')}
                                className="p-1.5 hover:bg-red-50 rounded transition text-base"
                                title="Close Assignment"
                              >
                                🔴
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateAssignmentModal
          editAssignment={editAssignment}
          onClose={() => { setShowCreate(false); setEditAssignment(null) }}
          onSaved={() => { setShowCreate(false); setEditAssignment(null); load() }}
        />
      )}

      {preview && (
        <AssignmentPreviewModal
          assignment={preview}
          role={user?.role}
          onClose={() => setPreview(null)}
          onEdit={() => handleEdit(preview)}
          onRefresh={load}
        />
      )}

      {viewSubmissions && (
        <ViewSubmissionsModal
          assignment={viewSubmissions}
          onClose={() => setViewSubmissions(null)}
        />
      )}
    </div>
  )
}
