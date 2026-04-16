import { useState } from 'react'
import { fmt } from '../utils/helpers'
import FileViewerModal from '../../../../features/courseChat/components/FileViewerModal'

export default function DetailsModal({ assignment, onClose }) {
  const [viewerFile, setViewerFile] = useState(null)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900">Assignment Details</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Title</p>
              <p className="text-base font-semibold text-gray-900">{assignment?.title}</p>
            </div>

            {assignment?.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{assignment.description}</p>
              </div>
            )}

            {assignment?.teacherInstruction && (
              <div className="bg-slate-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Instructions</p>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{assignment.teacherInstruction}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Due Date</p>
                <p className="text-sm text-gray-800">{fmt(assignment?.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Marks</p>
                <p className="text-sm text-gray-800">{assignment?.totalMarks ?? '—'} marks</p>
              </div>
            </div>

            {assignment?.status && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">
                  ⚠ {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                </span>
              </div>
            )}

            {/* Attachments from teacher */}
            {assignment?.assignmentFiles?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Attachments</p>
                <div className="space-y-2">
                  {assignment.assignmentFiles.map((af) => {
                    const f = af.file || af
                    return (
                      <button
                        key={af.id || f.id}
                        type="button"
                        onClick={() => setViewerFile({ fileId: f.id, name: f.name, fileUrl: f.fileUrl })}
                        className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition text-left group"
                      >
                        <svg className="w-4 h-4 text-[#6b1d3e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="flex-1 text-sm text-gray-700 truncate">{f.name}</span>
                        <span className="text-xs text-[#6b1d3e] opacity-0 group-hover:opacity-100 transition font-semibold">View →</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            style={{ backgroundColor: '#6b1d3e' }}
            className="mt-6 w-full px-4 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
          >
            Close
          </button>
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
