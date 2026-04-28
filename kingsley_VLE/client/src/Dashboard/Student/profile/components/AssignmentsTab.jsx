import { useState } from "react";
import { assignmentsApi } from "../../../../features/assignments/api/assignments.api";
import { useAssignmentsByCourse } from "../hooks/useAssignmentsByCourse";
import { fmt, isOverdue } from "../utils/helpers";
import SubmitModal from "./SubmitModal";
import DetailsModal from "./DetailsModal";
import EditSubmissionModal from "./EditSubmissionModal";
import FileViewerModal from "../../../../features/courseChat/components/FileViewerModal";

export default function AssignmentsTab({ courseId, sectionId }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const {
    assignments,
    submittedIds,
    setSubmittedIds,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage: hookCurrentPage,
    refetch,
  } = useAssignmentsByCourse(courseId, sectionId, currentPage);
  const [submitModal, setSubmitModal] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [editSubmissionModal, setEditSubmissionModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmitAssignment = async (
    assignment,
    { notes, submissionFileIds = [] },
  ) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {};
      if (notes) payload.submissionText = notes;
      if (submissionFileIds && submissionFileIds.length > 0)
        payload.submissionFileIds = submissionFileIds;

      await assignmentsApi.submit(assignment.id, payload);

      setSubmittedIds((prev) => new Set([...prev, assignment.id]));
      setSubmitSuccess(assignment.title);
      setSubmitModal(null);

      // Refetch to show newly submitted data in accordion
      await refetch();
      setExpandedSubmission(assignment.id);

      setTimeout(() => setSubmitSuccess(null), 3500);
    } catch (err) {
      setSubmitError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to submit. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm h-36" />
        ))}
      </div>
    );
  }

  const pending = assignments.filter((a) => !submittedIds.has(a.id));
  const submitted = assignments.filter((a) => submittedIds.has(a.id));

  return (
    <>
      {/* Modals */}
      {submitModal && (
        <SubmitModal
          assignment={submitModal}
          onClose={() => setSubmitModal(null)}
          onSubmit={handleSubmitAssignment}
          submitting={submitting}
        />
      )}
      {detailsModal && (
        <DetailsModal
          assignment={detailsModal}
          onClose={() => setDetailsModal(null)}
        />
      )}
      {editSubmissionModal && (
        <EditSubmissionModal
          assignment={editSubmissionModal.assignment}
          submission={editSubmissionModal.submission}
          onClose={() => setEditSubmissionModal(null)}
          onSubmit={async () => {
            setEditSubmissionModal(null);
            setSubmitSuccess(editSubmissionModal.assignment.title);
            // Refetch assignments to show updated submission with new files
            await refetch();
            setTimeout(() => setSubmitSuccess(null), 3500);
          }}
          isOverdue={isOverdue(editSubmissionModal.assignment.dueDate)}
          isGraded={
            editSubmissionModal.submission?.marks !== null &&
            editSubmissionModal.submission?.marks !== undefined
          }
        />
      )}
      {viewFile && (
        <div className="fixed inset-0 z-[60]">
          <FileViewerModal file={viewFile} onClose={() => setViewFile(null)} />
        </div>
      )}

      <div className="w-full">
        <div className="space-y-6 w-full">
          {/* Success toast */}
          {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700 font-medium">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            "{submitSuccess}" submitted successfully!
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Assignments
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete your assignments on time to maintain good grades
          </p>
        </div>

        {/* Empty state */}
        {assignments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">
              No assignments for this course yet.
            </p>
          </div>
        )}

        {/* Pending assignments - Table View */}
        {pending.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-[#6b1d3e]">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-semibold text-white w-2/5 lg:w-1/2">
                      Assignment Name
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/6 lg:w-1/6">
                      Due Date
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/6 lg:w-1/6">
                      Total Marks
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/6 lg:w-1/6">
                      Status
                    </th>
                    <th className="px-2 lg:px-3 py-3 text-center text-xs lg:text-sm font-semibold text-white w-1/4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pending.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-gray-50 transition border-b border-gray-100"
                    >
                      <td className="px-4 lg:px-6 py-3 lg:py-4 w-2/5 lg:w-1/2">
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
                            <p className="font-semibold text-gray-900 text-xs lg:text-sm leading-tight">
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
                      <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap w-1/6 lg:w-1/6">
                        {fmt(a.dueDate)}
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap w-1/6 lg:w-1/6">
                        {a.totalMarks ?? 100}
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 w-1/6 lg:w-1/6">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full bg-yellow-100 text-yellow-700 whitespace-nowrap">
                          ⚠ {isOverdue(a.dueDate) ? "Overdue" : "Pending"}
                        </span>
                      </td>
                      <td className="px-2 lg:px-3 py-3 lg:py-4 w-1/4">
                        <div className="flex items-center justify-center gap-1 lg:gap-2">
                          <button
                            onClick={() => setSubmitModal(a)}
                            style={{ backgroundColor: "#6b1d3e" }}
                            className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-xs font-semibold text-white rounded-lg hover:opacity-90 transition whitespace-nowrap"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => setDetailsModal(a)}
                            className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-xs font-semibold text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-100 transition whitespace-nowrap"
                          >
                            Details
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

        {/* Submitted assignments - Table View */}
        {submitted.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Submitted ({submitted.length})
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-[#6b1d3e]">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-semibold text-white w-2/5 lg:w-1/2">
                        Assignment Name
                      </th>
                      <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/6 lg:w-1/6">
                        Due Date
                      </th>
                      <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/6 lg:w-1/6">
                        Total Marks
                      </th>
                      <th className="px-2 lg:px-3 py-3 text-left text-xs lg:text-sm font-semibold text-white whitespace-nowrap w-1/6 lg:w-1/6">
                        Status
                      </th>
                      <th className="px-2 lg:px-3 py-3 text-center text-xs lg:text-sm font-semibold text-white w-1/4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submitted.map((a) => {
                      const submission = a.submissions?.[0];
                      const isGraded =
                        submission?.marks !== null &&
                        submission?.marks !== undefined;
                      const canEditSubmission =
                        !isOverdue(a.dueDate) && !isGraded;
                      const isExpanded = expandedSubmission === a.id;

                      return (
                        <>
                          <tr
                            key={`header-${a.id}`}
                            className="hover:bg-gray-50 transition border-b border-gray-100"
                          >
                            <td className="px-4 lg:px-6 py-3 lg:py-4 w-2/5 lg:w-1/2">
                              <div className="flex items-start gap-2 lg:gap-3">
                                <div className="w-8 lg:w-9 h-8 lg:h-9 rounded-lg bg-[#6b1d3e] flex items-center justify-center flex-shrink-0">
                                  <svg
                                    className="w-4 lg:w-5 h-4 lg:h-5 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 text-xs lg:text-sm leading-tight">
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
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap w-1/6 lg:w-1/6">
                              {fmt(a.dueDate)}
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap w-1/6 lg:w-1/6">
                              {isGraded ? (
                                <span className="text-[#6b1d3e] font-bold">
                                  {submission.marks}/{a.totalMarks}
                                </span>
                              ) : (
                                a.totalMarks ?? 100
                              )}
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 w-1/6 lg:w-1/6">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full bg-[#6b1d3e] text-white whitespace-nowrap">
                                ✓ Submitted
                              </span>
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 w-1/4">
                              <div className="flex items-center justify-center gap-1 lg:gap-2">
                                <button
                                  onClick={() =>
                                    setExpandedSubmission(
                                      isExpanded ? null : a.id
                                    )
                                  }
                                  className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-xs font-semibold text-[#6b1d3e] rounded-lg border border-[#6b1d3e] hover:bg-[#6b1d3e]/5 transition whitespace-nowrap"
                                >
                                  {isExpanded ? "Hide" : "View"}
                                </button>
                                <button
                                  onClick={() => setDetailsModal(a)}
                                  className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-xs font-semibold text-white bg-[#6b1d3e] rounded-lg hover:opacity-90 transition whitespace-nowrap"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded submission details row */}
                          {isExpanded && submission && (
                            <tr key={`details-${a.id}`}>
                              <td colSpan="5" className="px-4 lg:px-6 py-4 bg-gray-50">
                                <div className="space-y-4">
                                  {/* Submitted files */}
                                  {(submission.submissionFiles?.length > 0 ||
                                    submission.submissionFile) && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
                                        Submitted Files
                                      </p>
                                      <div className="space-y-2">
                                        {submission.submissionFiles?.map(
                                          (file) => (
                                            <button
                                              key={file.id}
                                              onClick={() =>
                                                setViewFile(file)
                                              }
                                              className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition text-left group"
                                            >
                                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                                <svg
                                                  className="w-4 h-4 text-[#6b1d3e]"
                                                  fill="currentColor"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                                                </svg>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm hover:text-[#6b1d3e] hover:underline truncate font-medium text-gray-700">
                                                  {file.name}
                                                </p>
                                              </div>
                                            </button>
                                          )
                                        )}
                                        {!submission.submissionFiles?.length &&
                                          submission.submissionFile && (
                                            <button
                                              onClick={() =>
                                                setViewFile(
                                                  submission.submissionFile
                                                )
                                              }
                                              className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition text-left group"
                                            >
                                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                                <svg
                                                  className="w-4 h-4 text-[#6b1d3e]"
                                                  fill="currentColor"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                                                </svg>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-700 truncate font-medium group-hover:underline">
                                                  {
                                                    submission.submissionFile
                                                      .name
                                                  }
                                                </p>
                                              </div>
                                            </button>
                                          )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Submitted notes */}
                                  {submission.submissionText && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                        Your Notes
                                      </p>
                                      <p className="text-sm text-gray-700 bg-gray-100 rounded-lg p-3 whitespace-pre-wrap line-clamp-3">
                                        {submission.submissionText}
                                      </p>
                                    </div>
                                  )}

                                  {/* Grading details */}
                                  {isGraded && (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-600 uppercase mb-3">
                                        Feedback & Grades
                                      </p>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-100 rounded-lg border border-gray-200">
                                        {submission.marks !== null &&
                                          submission.marks !== undefined && (
                                            <div>
                                              <p className="text-xs text-gray-600 font-semibold">
                                                Marks
                                              </p>
                                              <p className="text-lg font-bold text-[#6b1d3e]">
                                                {submission.marks}/
                                                {a.totalMarks}
                                              </p>
                                            </div>
                                          )}
                                        {submission.gradeLetter && (
                                          <div>
                                            <p className="text-xs text-gray-600 font-semibold">
                                              Grade
                                            </p>
                                            <p className="text-lg font-bold text-[#6b1d3e]">
                                              {submission.gradeLetter}
                                            </p>
                                          </div>
                                        )}
                                        {submission.feedback && (
                                          <div className="col-span-2 sm:col-span-1">
                                            <p className="text-xs text-gray-600 font-semibold mb-1">
                                              Feedback
                                            </p>
                                            <p className="text-sm line-clamp-2 whitespace-pre-wrap">
                                              {submission.feedback}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Action buttons */}
                                  {canEditSubmission && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          setEditSubmissionModal({
                                            assignment: a,
                                            submission,
                                          })
                                        }
                                        className="px-4 py-2 text-xs font-semibold text-[#6b1d3e] bg-[#6b1d3e]/10 rounded-lg hover:bg-[#6b1d3e]/20 transition"
                                      >
                                        Edit Submission
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * 15 + 1} to{" "}
              {Math.min(currentPage * 15, totalCount)} of {totalCount}{" "}
              assignments
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-[#6b1d3e] text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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
  );
}
