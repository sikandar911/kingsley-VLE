import { useState, useEffect, useRef } from "react";
import { assignmentsApi } from "../api/assignments.api";
import { useAuth } from "../../../context/AuthContext";
import FileViewerModal from "../../courseChat/components/FileViewerModal";
import TiptapEditor from "../../courseChat/components/TiptapEditor";

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
  submitted: "bg-blue-100 text-blue-700",
  late: "bg-orange-100 text-orange-700",
  missing: "bg-red-100 text-red-700",
};

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

const IQA_OPTIONS = [
  { value: "PENDING", label: "Pending", cls: "bg-gray-100 text-gray-600" },
  { value: "IN_REVIEW", label: "In Review", cls: "bg-blue-100 text-blue-700" },
  { value: "IQA_PASSED", label: "IQA Passed", cls: "bg-green-100 text-green-700" },
  { value: "IQA_FAILED", label: "IQA Failed", cls: "bg-red-100 text-red-700" },
];

const EQA_LABELS = {
  NOT_APPLICABLE: { label: "Not Applicable", cls: "bg-gray-100 text-gray-500" },
  PENDING_STUDENT_CONFIRMATION: { label: "Awaiting Student", cls: "bg-amber-100 text-amber-700" },
  CONFIRMED: { label: "Student Confirmed", cls: "bg-blue-100 text-blue-700" },
  LOCKED: { label: "Locked for EQA", cls: "bg-purple-100 text-purple-700" },
};

// ── Word counting utilities ──────────────────────────────────────────────────
const countWords = (text) => {
  if (!text || typeof text !== "string") return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

const countWordsInHtml = (html) => {
  if (!html) return 0;
  // Strip HTML tags and count words
  const plainText = html.replace(/<[^>]*>/g, " ");
  return countWords(plainText);
};

export default function ViewSubmissionsModal({ assignment, onClose }) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Which submission row is expanded
  const [expandedId, setExpandedId] = useState(null);
  
  // Which attempt within expanded submission is expanded
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);

  // Grading state (per parent submission)
  const [gradingId, setGradingId] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    marks: "",
    gradeLetter: "",
    attemptId: "",
  });
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState("");

  // IQA feedback state (per attempt)
  const [reviewingAttemptId, setReviewingAttemptId] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ feedback: "", iqaStatus: "" });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Attempt qualification state
  const [qualifyingId, setQualifyingId] = useState(null);
  const [qualifyLoading, setQualifyLoading] = useState(false);

  const [viewerFile, setViewerFile] = useState(null);

  // Feedback editor ref
  const feedbackEditorRef = useRef(null);



  const load = () => {
    setLoading(true);
    assignmentsApi
      .getSubmissions(assignment.id)
      .then((res) => setSubmissions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [assignment.id]);

  // ── Grading ──────────────────────────────────────────────────────────────
  const openGrade = (sub) => {
    const qualifiedAttempt = sub.attempts?.find((a) => a.isQualifiedForEqa);
    setGradeForm({
      marks: sub.marks ?? "",
      gradeLetter: sub.gradeLetter ?? "",
      attemptId: qualifiedAttempt?.id ?? "",
    });
    setGradeError("");
    setGradingId(sub.id);
  };

  const saveGrade = async () => {
    if (gradeForm.marks === "" || gradeForm.marks === null) {
      setGradeError("Marks is required");
      return;
    }
    const marks = Number(gradeForm.marks);
    if (marks < 0 || marks > assignment.totalMarks) {
      setGradeError(`Marks must be between 0 and ${assignment.totalMarks}`);
      return;
    }
    setGradeLoading(true);
    setGradeError("");
    try {
      await assignmentsApi.grade(gradingId, {
        marks,
        gradeLetter: gradeForm.gradeLetter || undefined,
        attemptId: gradeForm.attemptId || undefined,
        ...(user?.role === "admin" ? { markedByTeacherId: assignment.teacher?.id } : {}),
      });
      setGradingId(null);
      load();
    } catch (e) {
      setGradeError(e.response?.data?.error || "Failed to save grade");
    } finally {
      setGradeLoading(false);
    }
  };

  // ── IQA Feedback ─────────────────────────────────────────────────────────
  const openReview = (attempt, sub) => {
    setFeedbackForm({
      feedback: attempt.feedback ?? "",
      iqaStatus: sub.iqaStatus ?? "PENDING",
    });
    setReviewError("");
    setReviewingAttemptId(attempt.id);
    // Clear and set initial content in editor
    setTimeout(() => {
      if (feedbackEditorRef.current) {
        feedbackEditorRef.current.clear();
        if (attempt.feedback) {
          // If feedback contains HTML, set it directly; otherwise wrap plain text
          feedbackEditorRef.current.setContent(
            attempt.feedback.startsWith("<") ? attempt.feedback : `<p>${attempt.feedback}</p>`
          );
        }
      }
    }, 0);
  };

  const saveReview = async () => {
    setReviewLoading(true);
    setReviewError("");
    try {
      const feedbackHtml = feedbackEditorRef.current?.getHTML() ?? "";
      await assignmentsApi.reviewAttempt(reviewingAttemptId, {
        feedback: feedbackHtml || undefined,
        iqaStatus: feedbackForm.iqaStatus || undefined,
      });
      setReviewingAttemptId(null);
      load();
    } catch (e) {
      setReviewError(e.response?.data?.error || "Failed to save feedback");
    } finally {
      setReviewLoading(false);
    }
  };



  // ── Qualify for EQA ───────────────────────────────────────────────────────
  const handleQualify = async (attemptId) => {
    setQualifyingId(attemptId);
    setQualifyLoading(true);
    try {
      await assignmentsApi.qualifyAttempt(attemptId);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to qualify attempt");
    } finally {
      setQualifyLoading(false);
      setQualifyingId(null);
    }
  };

  const openFileViewer = (file) => {
    if (!file) return;
    setViewerFile({ fileId: file.id, name: file.name, fileUrl: file.fileUrl });
  };

  const gradedCount = submissions.filter((s) => s.marks !== null && s.marks !== undefined).length;
  const lockedCount = submissions.filter((s) => s.eqaStatus === "LOCKED").length;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex items-start justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Submissions</h2>
              <p className="text-sm text-gray-500 mt-1">
                {assignment.title} · Total marks: {assignment.totalMarks}
                {assignment.passingMarks ? ` · Passing: ${assignment.passingMarks}` : ""}
                {assignment.requiredWordCount ? ` · Required words: ${assignment.requiredWordCount.toLocaleString()}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-4"
            >
              <svg
                className="w-6 h-6"
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
              <div className="divide-y divide-gray-100">
                {submissions.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  const isGrading = gradingId === sub.id;
                  const iqaMeta = IQA_OPTIONS.find((o) => o.value === sub.iqaStatus);
                  const eqaMeta = EQA_LABELS[sub.eqaStatus];
                  return (
                    <div key={sub.id} className="transition">
                      {/* Submission row — click to expand */}
                      <div
                        className={`px-6 py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap cursor-pointer hover:bg-gray-50 transition ${isExpanded ? "bg-gray-50" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      >
                        {/* Student info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {sub.student?.fullName || "—"}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {sub.student?.studentId || "—"}
                          </p>
                        </div>

                        {/* Attempt count */}
                        <div className="flex-shrink-0 text-center min-w-[48px]">
                          <p className="text-xs text-gray-400">Attempts</p>
                          <p className="text-sm font-bold text-gray-700">{sub.attempts?.length || 0}</p>
                        </div>

                        {/* IQA status */}
                        <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${iqaMeta?.cls || "bg-gray-100 text-gray-600"}`}>
                          IQA: {iqaMeta?.label || sub.iqaStatus}
                        </span>

                        {/* EQA status */}
                        <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${eqaMeta?.cls || "bg-gray-100 text-gray-500"}`}>
                          EQA: {eqaMeta?.label || sub.eqaStatus}
                        </span>

                        {/* Score chip */}
                        <div className="flex-shrink-0 min-w-[80px] text-center">
                          {sub.marks !== null && sub.marks !== undefined ? (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              sub.marks >= (assignment.passingMarks ?? 0)
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {sub.marks}/{assignment.totalMarks}
                              {sub.gradeLetter ? ` · ${sub.gradeLetter}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not graded</span>
                          )}
                        </div>

                        {/* Expand indicator */}
                        <svg
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Expanded panel */}
                      {isExpanded && (
                        <div className="px-6 pb-6 bg-gray-50 border-t border-gray-100">
                          {/* Attempt History - Accordion */}
                          <div className="mt-4">
                            <p className="text-xs font-semibold text-gray-600 mb-2">
                              Submission Attempts ({sub.attempts?.length || 0})
                            </p>
                            {(!sub.attempts || sub.attempts.length === 0) && (
                              <p className="text-xs text-gray-400">No attempts yet.</p>
                            )}
                            {sub.attempts && sub.attempts.length > 0 && (
                              <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
                                {sub.attempts.map((attempt) => {
                                  const isExpanded = expandedAttemptId === attempt.id;
                                  const isReviewing = reviewingAttemptId === attempt.id;
                                  // Show "Qualify" button only if: this is NOT qualified AND no other attempt is qualified
                                  const anyQualified = sub.attempts.some((a) => a.isQualifiedForEqa);
                                  const canQualify = !attempt.isQualifiedForEqa && !anyQualified;

                                  return (
                                    <div key={attempt.id}>
                                      {/* Compact row */}
                                      <button
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition ${
                                          isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                                        }`}
                                        onClick={() =>
                                          setExpandedAttemptId(isExpanded ? null : attempt.id)
                                        }
                                      >
                                        {/* Attempt # */}
                                        <span className="text-xs font-bold text-gray-800 w-6 flex-shrink-0">
                                          #{attempt.attemptNumber}
                                        </span>

                                        {/* Date */}
                                        <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">
                                          {fmt(attempt.submittedAt)}
                                        </span>

                                        {/* Indicators */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          {attempt.feedback && (
                                            <span className="text-amber-500" title="Has feedback">
                                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                                              </svg>
                                            </span>
                                          )}
                                          {attempt.studentSelect ? (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">C</span>
                                          ) : attempt.isQualifiedForEqa ? (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">✓</span>
                                          ) : (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-semibold">•</span>
                                          )}
                                        </div>

                                        {/* Chevron */}
                                        <svg
                                          className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>

                                      {/* Expanded details */}
                                      {isExpanded && (
                                        <div className="px-3 py-3 bg-gray-50 border-t border-gray-100 space-y-2.5">
                                          {/* Content with word count */}
                                          {attempt.submissionText && (
                                            <div>
                                              <p className="text-xs font-semibold text-gray-500 mb-1">Student Message</p>
                                              <p className="text-xs text-gray-700 bg-white border border-gray-200 rounded p-2 whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
                                                {attempt.submissionText}
                                              </p>
                                            </div>
                                          )}

                                          {/* Files */}
                                          {attempt.submissionFiles?.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-gray-500 mb-1">Files</p>
                                              <div className="flex flex-col gap-1.5">
                                                {attempt.submissionFiles.map((f) => {

                                                  
                                                  return (
                                                    <div key={f.id}>
                                                      <button
                                                        onClick={() => openFileViewer(f)}
                                                        className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs text-[#6b1142] hover:bg-blue-50 transition w-full"
                                                      >
                                                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                                                        </svg>
                                                        <span className="truncate flex-1">{f.name}</span>
                                                      </button>
                                                      <div className="flex items-center gap-1 mt-0.5">
                                                        {attempt.wordCount !== null && attempt.wordCount !== undefined ? (
                                                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold inline-block ${
                                                            assignment.requiredWordCount
                                                              ? attempt.wordCount >= assignment.requiredWordCount
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-red-100 text-red-700"
                                                              : "bg-green-100 text-green-700"
                                                          }`}>
                                                            {attempt.wordCount.toLocaleString()} words
                                                            {assignment.requiredWordCount ? ` / ${assignment.requiredWordCount.toLocaleString()} required` : ""}
                                                          </span>
                                                        ) : (
                                                          <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold inline-block bg-gray-100 text-gray-600">
                                                            Counting words...
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}

                                          {/* Existing feedback display */}
                                          {attempt.feedback && !isReviewing && (
                                            <div>
                                              <p className="text-xs font-semibold text-amber-700 mb-1">Your Feedback</p>
                                              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2 leading-relaxed max-w-none space-y-1"
                                                dangerouslySetInnerHTML={{ 
                                                  __html: attempt.feedback
                                                    .replace(/<p>/g, '<p class="my-1">')
                                                    .replace(/<li>/g, '<li class="ml-4">')
                                                    .replace(/<ul>/g, '<ul class="my-1">')
                                                    .replace(/<ol>/g, '<ol class="my-1">')
                                                    .replace(/<h1>/g, '<h1 class="font-bold text-sm my-1">')
                                                    .replace(/<h2>/g, '<h2 class="font-bold text-sm my-1">')
                                                    .replace(/<h3>/g, '<h3 class="font-bold text-sm my-1">')
                                                }}
                                              />
                                            </div>
                                          )}

                                          {/* Qualify & Feedback buttons */}
                                          <div className="flex flex-col gap-2 pt-1">
                                            <div className="flex gap-1.5">
                                              {canQualify && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQualify(attempt.id);
                                                  }}
                                                  disabled={qualifyLoading && qualifyingId === attempt.id}
                                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition disabled:opacity-50"
                                                >
                                                  {qualifyLoading && qualifyingId === attempt.id ? (
                                                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Qualifying…</>
                                                  ) : (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Qualify for EQA</>
                                                  )}
                                                </button>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  isReviewing ? setReviewingAttemptId(null) : openReview(attempt, sub);
                                                }}
                                                className="flex-1 px-3 py-1.5 bg-[#6b1142] text-white text-xs font-semibold rounded hover:bg-[#5a0d38] transition"
                                              >
                                                {isReviewing ? "Cancel" : attempt.feedback ? "Edit" : "Feedback"}
                                              </button>
                                            </div>

                                            {/* Inline feedback form */}
                                            {isReviewing && (
                                              <div className="bg-white border border-gray-200 rounded p-2 space-y-2">
                                                <p className="text-xs font-semibold text-gray-700">
                                                  IQA Feedback for Attempt #{attempt.attemptNumber}
                                                </p>
                                                {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
                                                <div>
                                                  <label className="text-xs font-semibold text-gray-600 block mb-0.5">IQA Status</label>
                                                  <select
                                                    value={feedbackForm.iqaStatus}
                                                    onChange={(e) => setFeedbackForm((p) => ({ ...p, iqaStatus: e.target.value }))}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                                                  >
                                                    {IQA_OPTIONS.map((o) => (
                                                      <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="text-xs font-semibold text-gray-600 block mb-0.5">Feedback</label>
                                                  <div className="bg-white border border-gray-300 rounded overflow-hidden" style={{ minHeight: "120px" }}>
                                                    <TiptapEditor
                                                      ref={feedbackEditorRef}
                                                      placeholder="Write feedback… (supports bold, headings, lists, links)"
                                                      showToolbar={true}
                                                    />
                                                  </div>
                                                </div>
                                                <button
                                                  onClick={saveReview}
                                                  disabled={reviewLoading}
                                                  className="w-full px-3 py-1.5 bg-[#6b1142] text-white text-xs font-semibold rounded hover:bg-[#5a0d38] transition disabled:opacity-50"
                                                >
                                                  {reviewLoading ? "Saving…" : "Save Feedback"}
                                                </button>
                                              </div>
                                            )}

                                            {attempt.isQualifiedForEqa && (
                                              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-1.5 flex items-center gap-1">
                                                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                <span>Qualified for EQA</span>
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Final Grade panel */}
                          <div className="mt-5 bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-semibold text-gray-800">
                                Final Grade — {sub.student?.fullName}
                              </p>
                              {!isGrading && sub.eqaStatus !== "LOCKED" && (
                                <button onClick={() => openGrade(sub)}
                                  className="px-3 py-1.5 bg-[#6b1142] text-white text-xs font-medium rounded-lg hover:bg-[#5a0d38] transition">
                                  {sub.marks !== null && sub.marks !== undefined ? "Edit Grade" : "Grade"}
                                </button>
                              )}
                              {sub.eqaStatus === "LOCKED" && sub.marks !== null && sub.marks !== undefined && (
                                <span className="text-xs text-purple-600 font-semibold">🔒 Locked — Grade Saved</span>
                              )}
                            </div>

                            {sub.marks !== null && sub.marks !== undefined && !isGrading && (
                              <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                                  sub.marks >= (assignment.passingMarks ?? 0)
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}>
                                  {sub.marks}/{assignment.totalMarks}
                                  {sub.gradeLetter ? ` · ${sub.gradeLetter}` : ""}
                                </span>
                                {sub.markedByTeacher && (
                                  <span className="text-xs text-gray-400">
                                    by {sub.markedByTeacher.fullName} · {fmt(sub.markedAt)}
                                  </span>
                                )}
                              </div>
                            )}

                            {isGrading && (
                              <div className="space-y-4">
                                {gradeError && <p className="text-xs text-red-600">{gradeError}</p>}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                      Marks <span className="text-gray-400 font-normal">(max {assignment.totalMarks})</span>
                                      <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                      type="number" min={0} max={assignment.totalMarks} step={1}
                                      value={gradeForm.marks}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v !== "" && Number(v) < 0) { setGradeError("Marks cannot be negative"); return; }
                                        setGradeError("");
                                        setGradeForm((p) => ({ ...p, marks: v }));
                                      }}
                                      placeholder={`0 — ${assignment.totalMarks}`}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                                      Grade Letter <span className="text-gray-400 font-normal">— optional</span>
                                    </label>
                                    <select value={gradeForm.gradeLetter}
                                      onChange={(e) => setGradeForm((p) => ({ ...p, gradeLetter: e.target.value }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
                                    >
                                      <option value="">Select</option>
                                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <button onClick={saveGrade} disabled={gradeLoading}
                                      className="flex-1 px-4 py-2 bg-[#6b1142] text-white text-sm font-semibold rounded-lg hover:bg-[#5a0d38] transition disabled:opacity-50">
                                      {gradeLoading ? "Saving…" : "Save Grade"}
                                    </button>
                                    <button onClick={() => setGradingId(null)}
                                      className="px-3 py-2 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
              {gradedCount > 0 && <span className="ml-2 text-green-600">· {gradedCount} graded</span>}
              {lockedCount > 0 && <span className="ml-2 text-purple-600">· {lockedCount} locked for EQA</span>}
              {submissions.length - gradedCount > 0 && (
                <span className="ml-2 text-orange-500">· {submissions.length - gradedCount} pending</span>
              )}
            </p>
            <button onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </div>
      </div>

      {viewerFile && (
        <FileViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />
      )}
    </>
  );
}
