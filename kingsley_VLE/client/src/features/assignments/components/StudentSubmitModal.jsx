import { useRef, useState } from 'react'
import { assignmentsApi } from '../api/assignments.api'
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
    : 'No deadline'

const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip,.txt'

const IQA_LABELS = {
  PENDING: { label: 'Pending Review', cls: 'bg-gray-100 text-gray-600' },
  IN_REVIEW: { label: 'In Review', cls: 'bg-blue-100 text-blue-700' },
  IQA_PASSED: { label: 'IQA Passed', cls: 'bg-green-100 text-green-700' },
  IQA_FAILED: { label: 'IQA Failed', cls: 'bg-red-100 text-red-700' },
}

const EQA_LABELS = {
  NOT_APPLICABLE: { label: 'N/A', cls: 'bg-gray-100 text-gray-500' },
  PENDING_STUDENT_CONFIRMATION: { label: 'Awaiting Your Confirmation', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'EQA Confirmed', cls: 'bg-blue-100 text-blue-700' },
  LOCKED: { label: 'Locked for EQA', cls: 'bg-purple-100 text-purple-700' },
}

export default function StudentSubmitModal({ assignment, onClose, onSubmitted }) {
  // Read parent submission from assignment.submissions[0]
  const parentSub = assignment.submissions?.[0] || null
  const isLocked = parentSub?.eqaStatus === 'LOCKED'
  const awaitingConfirm = parentSub?.eqaStatus === 'PENDING_STUDENT_CONFIRMATION'
  const totalAttempts = parentSub?.attempts?.length || 0

  const [submissionText, setSubmissionText] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewerFile, setViewerFile] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const fileInputRef = useRef(null)

  const isLate = Boolean(assignment.dueDate && new Date() > new Date(assignment.dueDate))

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const res = await assignmentsApi.uploadFile(file, 'submission')
      setUploadedFile(res.data)
    } catch (err) {
      setUploadError(err.response?.data?.error || 'File upload failed. Try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // File is now required
    if (!uploadedFile) {
      setError('File submission is required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await assignmentsApi.submit(assignment.id, {
        submissionText: submissionText.trim() || null,
        submissionFileId: uploadedFile?.id || null,
      })
      onSubmitted()
    } catch (e) {
      setError(e.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentConfirm = async () => {
    if (!parentSub?.attempts) return
    const qualifiedAttempt = parentSub.attempts.find((a) => a.isQualifiedForEqa)
    if (!qualifiedAttempt) {
      setConfirmError('No qualified attempt found.')
      return
    }
    setConfirmLoading(true)
    setConfirmError('')
    try {
      await assignmentsApi.studentSelectAttempt(qualifiedAttempt.id)
      onSubmitted()
    } catch (e) {
      setConfirmError(e.response?.data?.error || 'Confirmation failed.')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-start justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Submit Assignment</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-sm truncate">{assignment.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Info strip */}
          <div className="bg-gray-50 border-b border-gray-200 px-8 py-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Deadline</p>
              <p className={`text-sm font-semibold mt-0.5 ${isLate ? 'text-red-600' : 'text-gray-800'}`}>
                {fmt(assignment.dueDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Marks</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{assignment.totalMarks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Attempts</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{totalAttempts}</p>
            </div>
          </div>

          {/* Status badges (IQA & EQA) */}
          {parentSub && (
            <div className="px-8 py-4 border-b border-gray-200 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${IQA_LABELS[parentSub.iqaStatus]?.cls || 'bg-gray-100 text-gray-600'}`}>
                  IQA: {IQA_LABELS[parentSub.iqaStatus]?.label || parentSub.iqaStatus}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${EQA_LABELS[parentSub.eqaStatus]?.cls || 'bg-gray-100 text-gray-500'}`}>
                  EQA: {EQA_LABELS[parentSub.eqaStatus]?.label || parentSub.eqaStatus}
                </span>
              </div>
            </div>
          )}

          <div className="px-8 py-6 space-y-6">
            {/* Locked banner */}
            {isLocked && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                <p className="text-sm text-purple-700 font-semibold">🔒 Submission Locked</p>
                <p className="text-xs text-purple-600 mt-1">Your submission has been confirmed and locked for External Quality Assurance. No new submissions are allowed.</p>
              </div>
            )}

            {/* Awaiting confirmation section */}
            {awaitingConfirm && !isLocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-amber-700 mb-2">⚠️ Ready for EQA Submission</p>
                <p className="text-xs text-amber-700 mb-3">
                  Your submission has passed Internal Quality Assurance. Please confirm to lock it for External Quality Assurance.
                </p>
                {confirmError && <p className="text-xs text-red-600 mb-2">{confirmError}</p>}
                <button
                  onClick={handleStudentConfirm}
                  disabled={confirmLoading}
                  className="w-full px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {confirmLoading ? 'Confirming…' : 'Confirm & Lock for EQA'}
                </button>
              </div>
            )}

            {/* Attempt history */}
            {parentSub && parentSub.attempts && parentSub.attempts.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Previous Attempts</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {parentSub.attempts.map((attempt) => (
                    <div key={attempt.id} className={`p-3 rounded-lg border text-xs ${
                      attempt.isQualifiedForEqa ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-gray-700">#{attempt.attemptNumber}</span>
                        {attempt.isQualifiedForEqa && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 font-semibold rounded">✓ Qualified</span>
                        )}
                        {attempt.studentSelect && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-semibold rounded">Student Confirmed</span>
                        )}
                        <span className="text-gray-500">{fmt(attempt.submittedAt)}</span>
                      </div>
                      {attempt.feedback && (
                        <p className="text-gray-600 mt-2">
                          <span className="font-semibold">Teacher Feedback:</span> {attempt.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submission form — hidden if locked */}
            {!isLocked && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {assignment.assignmentFiles?.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-700">📎 Attached Files</p>
                      <div className="mt-1 space-y-1">
                        {assignment.assignmentFiles.map((file) => (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => setViewerFile({ fileId: file.id, name: file.name, fileUrl: file.fileUrl })}
                            className="text-xs text-blue-600 underline hover:no-underline"
                          >
                            {file.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Response <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    rows={4}
                    placeholder="Write your response here…"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
                  />
                  {(() => {
                    const wc = submissionText.trim().split(/\s+/).filter(w => w.length > 0).length;
                    const req = assignment.requiredWordCount;
                    return submissionText.trim() ? (
                      <p className={`text-xs mt-1 ${req ? (wc >= req ? 'text-green-600' : 'text-red-500') : 'text-gray-400'}`}>
                        {wc.toLocaleString()} words{req ? ` / ${req.toLocaleString()} required` : ''}
                        {req && wc < req ? ` (${(req - wc).toLocaleString()} more needed)` : ''}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Upload File <span className="text-red-500">*</span> <span className="text-gray-400 font-normal text-xs">(required)</span>
                  </label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="flex-1 text-sm text-gray-800 font-medium truncate">{uploadedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setViewerFile({ fileId: uploadedFile.id, name: uploadedFile.name, fileUrl: uploadedFile.fileUrl })}
                        className="text-xs text-[#6b1142] font-semibold hover:underline flex-shrink-0"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-[#6b1142] rounded-xl p-6 text-center cursor-pointer transition hover:bg-gray-50"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPT}
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-[#6b1142] border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-gray-500">Uploading…</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-[#6b1142]">Click to upload</span> or drag & drop
                          </p>
                          <p className="text-xs text-gray-400">PDF, Word, Excel, PowerPoint, images</p>
                        </div>
                      )}
                    </div>
                  )}
                  {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className={`flex-1 px-5 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50 ${
                      isLate ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#6b1142] hover:bg-[#5a0d38]'
                    }`}
                  >
                    {loading ? 'Submitting…' : totalAttempts > 0 ? `Resubmit (Attempt #${totalAttempts + 1})` : 'Submit Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {viewerFile && (
        <FileViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />
      )}
    </>
  )
}
