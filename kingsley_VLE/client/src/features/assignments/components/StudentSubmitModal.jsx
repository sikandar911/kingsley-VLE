import { useState } from 'react'
import { assignmentsApi } from '../api/assignments.api'

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

export default function StudentSubmitModal({ assignment, onClose, onSubmitted }) {
  const [submissionText, setSubmissionText] = useState('')
  const [submissionFileUrl, setSubmissionFileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const existingAttempts = assignment.submissions?.length || 0
  const isLate = Boolean(assignment.dueDate && new Date() > new Date(assignment.dueDate))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!submissionText.trim() && !submissionFileUrl.trim()) {
      setError('Please provide a written response or a file URL')
      return
    }
    setError('')
    setLoading(true)
    try {
      await assignmentsApi.submit(assignment.id, {
        submissionText: submissionText.trim() || null,
        submissionFileUrl: submissionFileUrl.trim() || null,
      })
      onSubmitted()
    } catch (e) {
      setError(e.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
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

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Written Response
            </label>
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              rows={6}
              placeholder="Write your answer here…"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142] resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">File URL</label>
            <input
              type="url"
              value={submissionFileUrl}
              onChange={(e) => setSubmissionFileUrl(e.target.value)}
              placeholder="https://drive.google.com/… or any shareable file link"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Paste a Google Drive, Dropbox, or other publicly accessible link
            </p>
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
              disabled={loading}
              className={`flex-1 px-5 py-2.5 text-white rounded-lg font-medium transition disabled:opacity-50 ${
                isLate
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-[#6b1142] hover:bg-[#5a0d38]'
              }`}
            >
              {loading ? 'Submitting…' : existingAttempts > 0 ? 'Resubmit' : 'Submit Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
