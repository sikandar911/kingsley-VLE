import { useState, useEffect } from 'react'
import { assignmentsApi } from '../api/assignments.api'
import { useAuth } from '../../../context/AuthContext'

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

const statusCls = {
  submitted: 'bg-blue-100 text-blue-700',
  late: 'bg-orange-100 text-orange-700',
  missing: 'bg-red-100 text-red-700',
}

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']

export default function ViewSubmissionsModal({ assignment, onClose }) {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [gradingId, setGradingId] = useState(null)
  const [gradeForm, setGradeForm] = useState({ marks: '', gradeLetter: '', feedback: '' })
  const [gradeLoading, setGradeLoading] = useState(false)
  const [gradeError, setGradeError] = useState('')

  const load = () => {
    setLoading(true)
    assignmentsApi
      .getSubmissions(assignment.id)
      .then((res) => setSubmissions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [assignment.id])

  const openGrade = (sub) => {
    setGradeForm({
      marks: sub.marks ?? '',
      gradeLetter: sub.gradeLetter ?? '',
      feedback: sub.feedback ?? '',
    })
    setGradeError('')
    setGradingId(sub.id)
  }

  const saveGrade = async () => {
    const marks = gradeForm.marks !== '' ? Number(gradeForm.marks) : undefined
    if (marks !== undefined && (marks < 0 || marks > assignment.totalMarks)) {
      setGradeError(`Marks must be between 0 and ${assignment.totalMarks}`)
      return
    }
    setGradeLoading(true)
    setGradeError('')
    try {
      await assignmentsApi.grade(gradingId, {
        marks,
        gradeLetter: gradeForm.gradeLetter || undefined,
        feedback: gradeForm.feedback || undefined,
        ...(user?.role === 'admin' ? { markedByTeacherId: assignment.teacher?.id } : {}),
      })
      setGradingId(null)
      load()
    } catch (e) {
      setGradeError(e.response?.data?.error || 'Failed to save grade')
    } finally {
      setGradeLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-5 flex items-start justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Submissions</h2>
            <p className="text-sm text-gray-500 mt-1">
              {assignment.title} · Total marks: {assignment.totalMarks}
              {assignment.passingMarks ? ` · Passing: ${assignment.passingMarks}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-[#6b1142] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-5xl mb-3">📭</span>
              <p className="text-sm">No submissions yet</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['Student', 'Student ID', 'Attempt', 'Status', 'Submitted At', 'Score', 'Grade', 'Feedback', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((sub) => (
                  <>
                    <tr
                      key={sub.id}
                      className={`transition ${gradingId === sub.id ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3.5 font-medium text-gray-900">{sub.student?.fullName || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {sub.student?.studentId || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">#{sub.attemptNumber}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCls[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">{fmt(sub.submittedAt)}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900">
                        {sub.marks !== null && sub.marks !== undefined
                          ? `${sub.marks}/${assignment.totalMarks}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{sub.gradeLetter || '—'}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs max-w-[140px] truncate">
                        {sub.feedback || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {gradingId === sub.id ? (
                          <button
                            onClick={() => setGradingId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => openGrade(sub)}
                            className="px-3 py-1.5 bg-[#6b1142] text-white text-xs font-medium rounded-lg hover:bg-[#5a0d38] transition whitespace-nowrap"
                          >
                            {sub.marks !== null && sub.marks !== undefined ? 'Edit Grade' : 'Grade'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Inline grading row */}
                    {gradingId === sub.id && (
                      <tr key={`grade-${sub.id}`}>
                        <td colSpan={9} className="px-4 pb-4 pt-0">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-sm font-semibold text-gray-800">
                                Grading: {sub.student?.fullName}
                              </span>
                              {sub.submissionFileUrl && (
                                <a
                                  href={sub.submissionFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 underline"
                                >
                                  📎 View submitted file
                                </a>
                              )}
                            </div>

                            {sub.submissionText && (
                              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 text-xs text-gray-700 max-h-28 overflow-y-auto whitespace-pre-wrap">
                                {sub.submissionText}
                              </div>
                            )}

                            {gradeError && (
                              <p className="text-xs text-red-600 mb-3">{gradeError}</p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                  Marks (max {assignment.totalMarks})
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={assignment.totalMarks}
                                  value={gradeForm.marks}
                                  onChange={(e) =>
                                    setGradeForm((p) => ({ ...p, marks: e.target.value }))
                                  }
                                  placeholder={`0 – ${assignment.totalMarks}`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                  Grade Letter
                                </label>
                                <select
                                  value={gradeForm.gradeLetter}
                                  onChange={(e) =>
                                    setGradeForm((p) => ({ ...p, gradeLetter: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                                >
                                  <option value="">Select…</option>
                                  {GRADES.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  onClick={saveGrade}
                                  disabled={gradeLoading}
                                  className="w-full px-4 py-2 bg-[#6b1142] text-white text-sm font-semibold rounded-lg hover:bg-[#5a0d38] transition disabled:opacity-50"
                                >
                                  {gradeLoading ? 'Saving…' : 'Save Grade'}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Feedback (optional)
                              </label>
                              <textarea
                                value={gradeForm.feedback}
                                onChange={(e) =>
                                  setGradeForm((p) => ({ ...p, feedback: e.target.value }))
                                }
                                rows={2}
                                placeholder="Write feedback visible to the student…"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} total
            {submissions.filter((s) => s.marks !== null && s.marks !== undefined).length > 0 && (
              <span className="ml-2 text-green-600">
                · {submissions.filter((s) => s.marks !== null && s.marks !== undefined).length} graded
              </span>
            )}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
