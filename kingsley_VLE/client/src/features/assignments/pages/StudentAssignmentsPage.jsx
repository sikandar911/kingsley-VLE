import { useState, useEffect, useCallback } from 'react'
import { assignmentsApi } from '../api/assignments.api'
import AssignmentPreviewModal from '../components/AssignmentPreviewModal'
import StudentSubmitModal from '../components/StudentSubmitModal'

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

const getMyStatus = (assignment) => {
  const sub = assignment.submissions?.[0]
  if (!sub) {
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate))
      return { label: 'Overdue', cls: 'bg-red-100 text-red-700' }
    return { label: 'Not Submitted', cls: 'bg-gray-100 text-gray-500' }
  }
  if (sub.marks !== null && sub.marks !== undefined)
    return { label: 'Graded', cls: 'bg-green-100 text-green-700' }
  if (sub.status === 'late')
    return { label: 'Late Submitted', cls: 'bg-orange-100 text-orange-700' }
  return { label: 'Submitted', cls: 'bg-blue-100 text-blue-700' }
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [previewFull, setPreviewFull] = useState(null)
  const [submitAssignment, setSubmitAssignment] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    assignmentsApi
      .list()
      .then((res) => setAssignments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAudit = async (assignment) => {
    try {
      const res = await assignmentsApi.getById(assignment.id)
      setPreviewFull(res.data)
    } catch {
      setPreviewFull(assignment)
    }
  }

  const filtered = assignments.filter((a) => {
    const matchSearch =
      !searchTerm.trim() ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.course?.title.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchSearch) return false
    if (!filterStatus) return true

    const { label } = getMyStatus(a)
    return label.toLowerCase().replace(/\s+/g, '_').includes(filterStatus)
  })

  const submitted = assignments.filter((a) => a.submissions?.length > 0).length
  const pending = assignments.length - submitted
  const scores = assignments
    .map((a) => a.submissions?.[0]?.marks)
    .filter((m) => m !== null && m !== undefined)
  const avgScore = scores.length
    ? Math.round(scores.reduce((s, m) => s + m, 0) / scores.length)
    : null

  const stats = [
    { label: 'Total Assigned', value: assignments.length, icon: '📋', bg: 'bg-blue-50' },
    { label: 'Submitted', value: submitted, icon: '📤', bg: 'bg-green-50' },
    { label: 'Pending', value: pending, icon: '⏳', bg: 'bg-orange-50' },
    { label: 'Avg Score', value: avgScore !== null ? String(avgScore) : '—', icon: '📊', bg: 'bg-purple-50' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 md:px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-sm text-gray-500 mt-1">Assignments › My List</p>
      </div>

      {/* Stats */}
      <div className="px-5 md:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="px-5 md:px-8 pb-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by assignment or course name…"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] bg-white"
        >
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="pending">Pending</option>
          <option value="graded">Graded</option>
          <option value="overdue">Overdue</option>
          <option value="late">Late Submitted</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-5 md:px-8 pb-8 ">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-[#6b1142] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-5xl mb-3">📋</span>
              <p className="text-sm px-4 md:px-0 text-center md:text-center">
                {assignments.length === 0
                  ? 'No assignments have been assigned to you yet'
                  : 'No matching assignments'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Assignment', 'Course', 'Deadline', 'My Status', 'My Score', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a) => {
                    const { label, cls } = getMyStatus(a)
                    const sub = a.submissions?.[0]
                    const isOverdue = Boolean(a.dueDate && new Date() > new Date(a.dueDate))
                    const canSubmit =
                      a.status === 'published' && (!isOverdue || a.allowLateSubmission)

                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{a.title}</p>
                          {a.teacher && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Instructor: {a.teacher.fullName}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p className="text-gray-800">{a.course?.title || '—'}</p>
                          {a.section && (
                            <p className="text-xs text-gray-500 mt-0.5">{a.section.name}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {a.dueDate ? (
                            <p
                              className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}
                            >
                              {isOverdue ? '⚠️ ' : ''}
                              {fmt(a.dueDate)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400">No deadline</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {sub?.marks !== null && sub?.marks !== undefined
                            ? `${sub.marks}/${a.totalMarks}${sub.gradeLetter ? ` (${sub.gradeLetter})` : ''}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* View Details / Audit */}
                            <button
                              onClick={() => openAudit(a)}
                              className="p-1.5 hover:bg-gray-100 rounded transition"
                              title="View Details & Results"
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

                            {/* Submit / Resubmit */}
                            {canSubmit && (
                              <button
                                onClick={() => setSubmitAssignment(a)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition ${
                                  isOverdue
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : 'bg-[#6b1142] hover:bg-[#5a0d38]'
                                }`}
                                title={isOverdue ? 'Submit Late' : 'Submit'}
                              >
                                {isOverdue ? 'Late Submit' : sub ? 'Resubmit' : 'Submit'}
                              </button>
                            )}

                            {!canSubmit && a.status === 'closed' && (
                              <span className="px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-lg">
                                Closed
                              </span>
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

      {/* Preview / Audit modal */}
      {previewFull && (
        <AssignmentPreviewModal
          assignment={previewFull}
          role="student"
          onClose={() => setPreviewFull(null)}
          onRefresh={() => { setPreviewFull(null); load() }}
        />
      )}

      {/* Submit modal */}
      {submitAssignment && (
        <StudentSubmitModal
          assignment={submitAssignment}
          onClose={() => setSubmitAssignment(null)}
          onSubmitted={() => { setSubmitAssignment(null); load() }}
        />
      )}
    </div>
  )
}
