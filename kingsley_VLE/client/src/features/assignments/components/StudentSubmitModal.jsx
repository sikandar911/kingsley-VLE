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

export default function StudentSubmitModal({ assignment, onClose, onSubmitted }) {
  const [submissionText, setSubmissionText] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null) // { id, name, fileUrl }
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewerFile, setViewerFile] = useState(null)
  const fileInputRef = useRef(null)

  const existingAttempts = assignment.submissions?.length || 0
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
      // reset input so the same file can be re-selected if needed
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!submissionText.trim() && !uploadedFile) {
      setError('Please provide a written response or upload a file.')
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

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-200 px-8 py-6 flex items-start justify-between">
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
              <p className="text-xs text-gray-500">Attempt Number</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">#{existingAttempts + 1}</p>
            </div>
          </div>

          {/* Attachment reminder */}
          {assignment.assignmentFiles?.length > 0 && (
            <div className="mx-8 mt-5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <p className="text-xs text-blue-700">
                This assignment has {assignment.assignmentFiles.length} attachment{assignment.assignmentFiles.length !== 1 ? 's' : ''}.{' '}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={onClose} // student can go back to preview to view attachments
                >
                  View in assignment details.
                </button>
              </p>
            </div>
          )}

          {/* Late warning */}
          {isLate && (
            <div className="mx-8 mt-5 bg-orange-50 border border-orange-200 text-orange-700 text-sm px-4 py-3 rounded-lg">
              ⚠️ The deadline has passed. This will be marked as a <strong>late submission</strong>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Written response */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Written Response
              </label>
              <textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={5}
                placeholder="Write your answer here…"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">AND / OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Upload File</label>
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
                {loading ? 'Submitting…' : existingAttempts > 0 ? 'Resubmit' : 'Submit Assignment'}
              </button>
            </div>
          </form>
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
