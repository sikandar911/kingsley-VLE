import { useState } from "react";
import { assignmentsApi } from "../../../../features/assignments/api/assignments.api";
import { useAssignmentsByCourse } from "../hooks/useAssignmentsByCourse";
import { fmt, isOverdue } from "../utils/helpers";
import SubmitModal from "./SubmitModal";
import DetailsModal from "./DetailsModal";

export default function AssignmentsTab({ courseId, sectionId }) {
  const [currentPage, setCurrentPage] = useState(1);
  const { assignments, submittedIds, loading, error, totalCount, totalPages } =
    useAssignmentsByCourse(courseId, sectionId, currentPage);
  const [submitModal, setSubmitModal] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmitAssignment = async (assignment, { notes }) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {};
      if (notes) payload.notes = notes;

      await assignmentsApi.submit(assignment.id, payload);

      setSubmittedIds((prev) => new Set([...prev, assignment.id]));
      setSubmitSuccess(assignment.title);
      setSubmitModal(null);

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

      <div className="space-y-6">
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
          <p className="text-sm text-[#6b1d3e] mt-0.5">
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

        {/* Pending assignments */}
        {pending.length > 0 && (
          <div className="space-y-4">
            {pending.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Document icon */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#6b1d3e]/10 flex items-center justify-center mt-0.5">
                      <svg
                        className="w-5 h-5 text-[#6b1d3e]"
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

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                        {a.title}
                      </h3>
                      {a.description && (
                        <p className="text-sm text-[#6b1d3e] mt-1 line-clamp-2">
                          {a.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pending badge */}
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 whitespace-nowrap">
                    ⚠ {isOverdue(a.dueDate) ? "Overdue" : "Pending"}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 text-xs text-gray-500 mb-4 pt-3 sm:pt-1 border-t sm:border-t-0 border-gray-200">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Due: {fmt(a.dueDate)}
                  </span>
                  {a.totalMarks != null && (
                    <span className="flex items-center gap-1 text-[#6b1d3e] font-medium">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {a.totalMarks} marks
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex w-full flex-col md:flex-row gap-2">
                  <button
                    onClick={() => setSubmitModal(a)}
                    style={{ backgroundColor: "#6b1d3e" }}
                    className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition"
                  >
                    Submit Assignment
                  </button>
                  <button
                    onClick={() => setDetailsModal(a)}
                    className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submitted assignments */}
        {submitted.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Submitted ({submitted.length})
            </h3>
            <div className="space-y-3">
              {submitted.map((a) => (
                <div
                  key={a.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 opacity-75"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-green-600"
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
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {a.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          Due: {fmt(a.dueDate)}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                      ✓ Submitted
                    </span>
                  </div>
                </div>
              ))}
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
    </>
  );
}
