import { useState, useEffect } from 'react'
import { assignmentsApi } from '../api/assignments.api'
import { useAuth } from '../../../context/AuthContext'
import FileViewerModal from '../../courseChat/components/FileViewerModal'

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'â€”'

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
  const [viewerFile, setViewerFile] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

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

  const openFileViewer = (file) => {
    if (!file) return
    setViewerFile({ fileId: file.id, name: file.name, fileUrl: file.fileUrl })
  }

  const gradedCount = submissions.filter((s) => s.marks !== null && s.marks !== undefined).length

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex items-start justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Submissions</h2>
              <p className="text-sm text-gray-500 mt-1">
                {assignment.title} Â· Total marks: {assignment.totalMarks}
                {assignment.passingMarks ? ` Â· Passing: ${assignment.passingMarks}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-4">
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
                <span className="text-5xl mb-3">ðŸ“­</span>
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {submissions.map((sub) => {
                  const isExpanded = expandedId === sub.id
                  const isGrading = gradingId === sub.id
                  const hasSubmittedFile = sub.submissionFile
                  const hasSubmittedUrl = sub.submissionFileUrl
                  return (
                    <div
                      key={sub.id}
                      className={`transition ${isGrading ? 'bg-amber-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      {/* Submission row */}
                      <div className="px-6 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        {/* Student info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">{sub.student?.fullName || 'â€”'}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{sub.student?.studentId || 'â€”'}</p>
                        </div>

                        {/* Attempt + status */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">#{sub.attemptNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCls[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                            {sub.status}
                          </span>
                        </div>

                        {/* Submitted at */}
                        <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 hidden md:block">
                          {fmt(sub.submittedAt)}
                        </p>

                        {/* Score chip */}
                        <div className="flex-shrink-0 min-w-[80px] text-center">
                          {sub.marks !== null && sub.marks !== undefined ? (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              sub.marks >= (assignment.passingMarks ?? 0) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {sub.marks}/{assignment.totalMarks}
                              {sub.gradeLetter ? ` Â· ${sub.gradeLetter}` : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not graded</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* View submitted file */}
                          {hasSubmittedFile && (
                            <button
                              onClick={() => openFileViewer(sub.submissionFile)}
                              title="View submitted file"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View File
                            </button>
                          )}
                          {hasSubmittedUrl && !hasSubmittedFile && (
                            <a
                              href={sub.submissionFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                              ðŸ“Ž View Link
                            </a>
                          )}

                          {/* Expand for text */}
                          {sub.submissionText && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                              {isExpanded ? 'Collapse' : 'Read'}
                            </button>
                          )}

                          {/* Grade / Edit */}
                          {isGrading ? (
                            <button
                              onClick={() => setGradingId(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 underline px-2"
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
                        </div>
                      </div>

                      {/* Expanded text */}
                      {isExpanded && sub.submissionText && (
                        <div className="px-6 pb-4">
                          <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {sub.submissionText}
                          </div>
                          {sub.feedback && (
                            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
                              <span className="font-semibold">Feedback: </span>{sub.feedback}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline grading panel */}
                      {isGrading && (
                        <div className="px-6 pb-6">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                              <span className="text-sm font-semibold text-gray-800">
                                Grading: {sub.student?.fullName}
                              </span>
                              {hasSubmittedFile && (
                                <button
                                  type="button"
                                  onClick={() => openFileViewer(sub.submissionFile)}
                                  className="text-xs text-[#6b1142] font-semibold hover:underline flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Open Submitted File
                                </button>
                              )}
                              {hasSubmittedUrl && !hasSubmittedFile && (
                                <a
                                  href={sub.submissionFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 underline flex items-center gap-1"
                                >
                                  ðŸ“Ž View submitted link
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
                                  Marks <span className="text-gray-400 font-normal">(max {assignment.totalMarks}) â€” optional</span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={assignment.totalMarks}
                                  value={gradeForm.marks}
                                  onChange={(e) =>
                                    setGradeForm((p) => ({ ...p, marks: e.target.value }))
                                  }
                                  placeholder={`0 â€“ ${assignment.totalMarks}`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                  Grade Letter <span className="text-gray-400 font-normal">â€” optional</span>
                                </label>
                                <select
                                  value={gradeForm.gradeLetter}
                                  onChange={(e) =>
                                    setGradeForm((p) => ({ ...p, gradeLetter: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                                >
                                  <option value="">Selectâ€¦</option>
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
                                  {gradeLoading ? 'Savingâ€¦' : 'Save Grade'}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                Feedback <span className="text-gray-400 font-normal">(optional â€” visible to student)</span>
                              </label>
                              <textarea
                                value={gradeForm.feedback}
                                onChange={(e) =>
                                  setGradeForm((p) => ({ ...p, feedback: e.target.value }))
                                }
                                rows={2}
                                placeholder="Write feedback visible to the studentâ€¦"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                              />
                            </div>

                            {sub.markedByTeacher && (
                              <p className="text-xs text-gray-400 mt-3">
                                Previously graded by {sub.markedByTeacher.fullName} Â· {fmt(sub.markedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              {gradedCount > 0 && (
                <span className="ml-2 text-green-600">
                  Â· {gradedCount} graded
                </span>
              )}
              {submissions.length - gradedCount > 0 && (
                <span className="ml-2 text-orange-500">
                  Â· {submissions.length - gradedCount} pending
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

      {viewerFile && (
        <FileViewerModal
          file={viewerFile}
          onClose={() => setViewerFile(null)}
        />
      )}
    </>
  )
}
