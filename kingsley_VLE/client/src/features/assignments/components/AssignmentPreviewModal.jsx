import { useState } from "react";
import ViewSubmissionsModal from "./ViewSubmissionsModal";
import StudentSubmitModal from "./StudentSubmitModal";
import FileViewerModal from "../../courseChat/components/FileViewerModal";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const statusCls = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
};

const subStatusCls = {
  submitted: "bg-blue-100 text-blue-700",
  late: "bg-orange-100 text-orange-700",
  missing: "bg-red-100 text-red-700",
};

export default function AssignmentPreviewModal({
  assignment,
  role,
  onClose,
  onEdit,
  onRefresh,
}) {
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);

  const mySubmissions = assignment.submissions || [];
  const isOverdue = Boolean(
    assignment.dueDate && new Date() > new Date(assignment.dueDate),
  );
  const canSubmit =
    role === "student" &&
    assignment.status === "published" &&
    (!isOverdue || assignment.allowLateSubmission);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-50">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 z-10 relative">
            <div className="flex-1 min-w-0 pr-10">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight">
                {assignment.title}
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {assignment.course && (
                  <span>
                    Course:{" "}
                    <strong className="text-gray-700">
                      {assignment.course.title}
                    </strong>
                  </span>
                )}
                {assignment.section && (
                  <span>
                    Section:{" "}
                    <strong className="text-gray-700">
                      {assignment.section.name}
                    </strong>
                  </span>
                )}
                {assignment.teacher && (
                  <span>
                    Instructor:{" "}
                    <strong className="text-gray-700">
                      {assignment.teacher.fullName}
                    </strong>
                  </span>
                )}
              </p>
            </div>

            <div className="absolute top-4 md:top-6 right-4 md:right-8 flex flex-col-reverse md:flex-row items-center gap-3">
              <span
                className={`mt-2.5 md:mt-0 px-2 md:px-3 py-1.5 rounded-full text-[10.5px] md:text-sm font-semibold capitalize whitespace-nowrap ${statusCls[assignment.status] || "bg-gray-100 text-gray-600"}`}
              >
                {assignment.status}
              </span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            <div className="p-5 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-5 md:gap-5 lg:gap-0">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-8 lg:mb-5">
                  {assignment.description && (
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-3">
                        Description
                      </h2>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                        {assignment.description}
                      </p>
                    </div>
                  )}

                  {assignment.teacherInstruction && (
                    <div className=" bg-slate-50  rounded-lg p-6 border border-gray-200">
                      <h2 className="text-base font-bold text-gray-900 mb-3">
                        Instructions
                      </h2>
                      <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                        {assignment.teacherInstruction}
                      </div>
                    </div>
                  )}

                  {assignment.rubrics?.length > 0 && (
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-3">
                        Grading Rubric
                      </h2>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">
                                Criteria
                              </th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">
                                Max Marks
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {assignment.rubrics.map((r) => (
                              <tr key={r.id}>
                                <td className="px-4 py-3 text-gray-700">
                                  {r.criteria}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                  {r.maxMarks}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {assignment.assignmentFiles?.length > 0 && (
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-3">
                        Attachments
                      </h2>
                      <div className="space-y-2">
                        {assignment.assignmentFiles.map((af) => {
                          const f = af.file || af;
                          return (
                            <button
                              key={af.id || f.id}
                              type="button"
                              onClick={() => setViewerFile({ fileId: f.id, name: f.name, fileUrl: f.fileUrl })}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition text-left group"
                            >
                              <svg className="w-5 h-5 text-[#6b1142] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="flex-1 text-sm text-gray-800 truncate font-medium">{f.name}</span>
                              <span className="text-xs text-[#6b1142] opacity-0 group-hover:opacity-100 transition font-semibold flex-shrink-0">
                                View →
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Student submission history */}
                  {role === "student" && mySubmissions.length > 0 && (
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-3">
                        My Submissions
                      </h2>
                      <div className="space-y-3">
                        {mySubmissions.map((sub) => (
                          <div
                            key={sub.id}
                            className="border border-gray-200 rounded-xl p-5"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  Attempt #{sub.attemptNumber}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${subStatusCls[sub.status] || "bg-gray-100 text-gray-500"}`}
                                >
                                  {sub.status}
                                </span>
                                {sub.marks !== null &&
                                  sub.marks !== undefined && (
                                    <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                      {sub.marks}/{assignment.totalMarks}
                                      {sub.gradeLetter
                                        ? ` · ${sub.gradeLetter}`
                                        : ""}
                                    </span>
                                  )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {fmt(sub.submittedAt)}
                              </span>
                            </div>

                            {sub.submissionText && (
                              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 line-clamp-3 mb-2">
                                {sub.submissionText}
                              </p>
                            )}
                            {sub.submissionFile && (
                              <button
                                type="button"
                                onClick={() => setViewerFile({ fileId: sub.submissionFile.id, name: sub.submissionFile.name, fileUrl: sub.submissionFile.fileUrl })}
                                className="text-xs text-[#6b1142] underline flex items-center gap-1 mb-2 hover:text-[#5a0d38]"
                              >
                                📎 View submitted file
                              </button>
                            )}
                            {!sub.submissionFile && sub.submissionFileUrl && (
                              <a
                                href={sub.submissionFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline block mb-2"
                              >
                                📎 View submitted link
                              </a>
                            )}

                            {sub.feedback && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 mb-1">
                                  Teacher feedback:
                                </p>
                                <p className="text-sm text-gray-700">
                                  {sub.feedback}
                                </p>
                              </div>
                            )}
                            {sub.markedByTeacher && (
                              <p className="text-xs text-gray-400 mt-2">
                                Graded by {sub.markedByTeacher.fullName} ·{" "}
                                {fmt(sub.markedAt)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {role === "student" && mySubmissions.length === 0 && (
                    <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                      <p className="text-sm text-gray-500">
                        You have not submitted this assignment yet.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  {/* Timeline */}
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">
                      Timeline
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Created</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {fmt(assignment.createdAt)}
                        </p>
                      </div>
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                        <p
                          className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-gray-900"}`}
                        >
                          {assignment.dueDate
                            ? fmt(assignment.dueDate)
                            : "No deadline set"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grading */}
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-4">
                      Grading
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {assignment.totalMarks}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Passing</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {assignment.passingMarks ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Target</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5 capitalize">
                        {assignment.targetType === "section"
                          ? `Section: ${assignment.section?.name || "—"}`
                          : "All enrolled students"}
                      </p>
                    </div>
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs text-gray-500">Late Submission</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {assignment.allowLateSubmission
                          ? "✓ Allowed"
                          : "✗ Not allowed"}
                      </p>
                    </div>
                    {(role === "teacher" || role === "admin") && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-500">
                          Total Submissions
                        </p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                          {assignment._count?.submissions ?? "—"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 md:px-8 py-4 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
            <p className="text-xs text-gray-400">
              Last updated: {fmt(assignment.updatedAt)}
            </p>
            <div className="space-y-2 md:space-y-0 md:flex md:gap-3">
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 md:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Close
                </button>

                {(role === "teacher" || role === "admin") && (
                  <>
                    {onEdit && (
                      <button
                        onClick={() => {
                          onClose();
                          onEdit();
                        }}
                        className="flex-1 md:flex-none px-4 py-2 border border-[#6b1142] text-[#6b1142] rounded-lg text-sm font-medium hover:bg-[#6b1142]/5 transition"
                      >
                        Edit
                      </button>
                    )}
                  </>
                )}

                {role === "student" && canSubmit && (
                  <button
                    onClick={() => setShowSubmit(true)}
                    className={`flex-1 md:flex-none px-4 py-2 text-white rounded-lg text-sm font-medium transition ${
                      isOverdue
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-[#6b1142] hover:bg-[#5a0d38]"
                    }`}
                  >
                    {isOverdue
                      ? "Submit Late"
                      : mySubmissions.length > 0
                        ? "Resubmit"
                        : "Submit Assignment"}
                  </button>
                )}
              </div>

              {(role === "teacher" || role === "admin") && (
                <button
                  onClick={() => setShowSubmissions(true)}
                  className="w-full md:w-auto px-4 py-2 bg-[#6b1142] text-white rounded-lg text-sm font-medium hover:bg-[#5a0d38] transition"
                >
                  View Submissions
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSubmissions && (
        <ViewSubmissionsModal
          assignment={assignment}
          onClose={() => setShowSubmissions(false)}
        />
      )}

      {showSubmit && (
        <StudentSubmitModal
          assignment={assignment}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => {
            setShowSubmit(false);
            onRefresh?.();
            onClose();
          }}
        />
      )}

      {viewerFile && (
        <FileViewerModal
          file={viewerFile}
          onClose={() => setViewerFile(null)}
        />
      )}
    </>
  );
}
