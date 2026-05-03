import { useState } from 'react'
import { useTeacherAssignmentsByCourse } from '../hooks'
import { fmt, isOverdue } from '../utils/helpers'

const STATUS_COLORS = {
  published: 'bg-[#6b1d3e] text-white',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-yellow-100 text-yellow-700',
}

function AssignmentDetailsModal({ assignment, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Assignment Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{assignment.title}</h3>
            {assignment.description && (
              <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
            )}
          </div>
          {assignment.teacherInstruction && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Instructions</p>
              <p className="text-sm text-gray-700">{assignment.teacherInstruction}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Due Date</p>
              <p className="font-medium text-gray-800">{fmt(assignment.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Total Marks</p>
              <p className="font-medium text-gray-800">{assignment.totalMarks ?? 100}</p>
            </div>
            {assignment.passingMarks != null && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Passing Marks</p>
                <p className="font-medium text-gray-800">{assignment.passingMarks}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Late Submission</p>
              <p className="font-medium text-gray-800">
                {assignment.allowLateSubmission ? 'Allowed' : 'Not Allowed'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Submissions</p>
              <p className="font-medium text-gray-800">{assignment._count?.submissions ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[assignment.status] || 'bg-gray-100 text-gray-600'}`}>
                {assignment.status}
              </span>
            </div>
          </div>
          {Array.isArray(assignment.rubrics) && assignment.rubrics.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rubrics</p>
              <div className="space-y-1">
                {assignment.rubrics.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-700">{r.criteria}</span>
                    <span className="font-semibold text-[#6b1d3e]">{r.maxMarks} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TeacherAssignmentsTab({ courseId, sectionId }) {
  const [currentPage, setCurrentPage] = useState(1)
  const { assignments, loading, error, totalCount, totalPages } = useTeacherAssignmentsByCourse(
    courseId,
    sectionId,
    currentPage
  )
  const [detailsModal, setDetailsModal] = useState(null)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm h-36" />
        ))}
      </div>
    )
  }

  return (
    <>
      {detailsModal && (
        <AssignmentDetailsModal
          assignment={detailsModal}
          onClose={() => setDetailsModal(null)}
        />
      )}

      <div className="w-full">
        <div className="space-y-6 w-full">
          {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Assignments</h2>
          <p className="text-sm text-[#6b1d3e] mt-0.5">
            Manage and track assignments for this course
          </p>
        </div>

        {/* Empty state */}
        {assignments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">No assignments for this course yet.</p>
          </div>
        )}

        {/* Assignment cards */}
        {assignments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-[#6b1d3e]">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-semibold text-white w-1/3 lg:w-2/5">
                      Assignment Name
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/8">
                      Due Date
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/8">
                      Total Marks
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/8">
                      Submissions
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/8">
                      Status
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-center text-xs lg:text-sm font-semibold text-white w-1/6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assignments.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-gray-50 transition border-b border-gray-100"
                    >
                      <td className="px-4 lg:px-6 py-3 lg:py-4 w-1/3 lg:w-2/5">
                        <div className="flex items-start gap-2 lg:gap-3">
                          <div className="w-8 lg:w-9 h-8 lg:h-9 rounded-lg bg-[#6b1d3e]/10 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-4 lg:w-5 h-4 lg:h-5 text-[#6b1d3e]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold whitespace-nowrap text-gray-900 text-xs lg:text-sm leading-tight">
                              {a.title}
                            </p>
                            {a.description && (
                              <p className="text-xs text-gray-500 line-clamp-1 lg:line-clamp-2 mt-0.5">
                                {a.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap w-1/8">
                        {fmt(a.dueDate)}
                        {isOverdue(a.dueDate) && a.status === 'published' && (
                          <span className="ml-1 text-red-500 font-medium text-xs">
                            (O)
                          </span>
                        )}
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap w-1/8">
                        {a.totalMarks ?? 100}
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 w-1/8">
                        <div className="flex items-center gap-1 lg:gap-2">
                          <span className="text-xs lg:text-sm font-bold text-[#6b1d3e]">
                            {a._count?.submissions ?? 0}
                          </span>
                          <span className="text-xs text-gray-500 hidden lg:inline">
                            {(a._count?.submissions ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 w-1/8">
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full capitalize whitespace-nowrap ${
                            STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 w-1/6">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setDetailsModal(a)}
                            className="px-2 lg:px-3 py-1.5 whitespace-nowrap lg:py-2 text-xs lg:text-sm font-semibold text-white bg-[#6b1d3e] rounded-lg hover:opacity-90 transition"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * 15 + 1} to {Math.min(currentPage * 15, totalCount)} of {totalCount} assignments
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      currentPage === page
                        ? 'bg-[#6b1d3e] text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  )
}
