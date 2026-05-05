import { useState, useRef } from "react";
import { assignmentsApi } from "../api/assignments.api";
import FileViewerModal from "../../courseChat/components/FileViewerModal";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const IQA_STATUS_MAP = {
  PENDING: { label: "Pending Review", cls: "bg-gray-100 text-gray-600" },
  IN_REVIEW: { label: "In Review", cls: "bg-blue-100 text-blue-700" },
  IQA_PASSED: { label: "IQA Passed", cls: "bg-green-100 text-green-700" },
  IQA_FAILED: { label: "IQA Failed", cls: "bg-red-100 text-red-700" },
};

const IQA_DESC = {
  PENDING: "Your submission is awaiting teacher review.",
  IN_REVIEW: "Your submission is currently being reviewed by the teacher.",
  IQA_PASSED:
    "Your submission has passed the Internal Quality Assurance (IQA) review. A qualified attempt is ready for EQA confirmation.",
  IQA_FAILED:
    "Your submission did not pass IQA. Review the teacher feedback and submit again.",
};

export default function StudentSubmissionAttemptsModal({
  submission,
  assignment,
  onRefresh,
}) {
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);
  const [viewFile, setViewFile] = useState(null);

  // EQA selection
  const [selectingId, setSelectingId] = useState(null);
  const [selectLoading, setSelectLoading] = useState(false);
  const [selectError, setSelectError] = useState(null);

  // Delete attempt
  const [deletingAttemptId, setDeletingAttemptId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // New submission form
  const [showForm, setShowForm] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]); // {file, uploading, done, id, name, error, wordCount}
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [uploadAlerts, setUploadAlerts] = useState({}); // {fileId: "message"}
  
  const fileInputRef = useRef(null);

  const isLocked = submission.eqaStatus === "LOCKED";
  const iqaMeta = IQA_STATUS_MAP[submission.iqaStatus] ?? IQA_STATUS_MAP.PENDING;
  const attempts = submission.attempts ?? [];

  // ── EQA selection ────────────────────────────────────────────────────────
  const handleSelectForEqa = async (attemptId) => {
    if (
      !window.confirm(
        "Are you sure you want to confirm this attempt for EQA?\n\nThis action is final — your submission will be locked and no further changes can be made."
      )
    )
      return;
    setSelectingId(attemptId);
    setSelectLoading(true);
    setSelectError(null);
    try {
      await assignmentsApi.studentSelectAttempt(attemptId);
      onRefresh?.();
    } catch (err) {
      setSelectError(err.response?.data?.error || "Failed to confirm. Try again.");
    } finally {
      setSelectLoading(false);
      setSelectingId(null);
    }
  };

  // ── Delete attempt ───────────────────────────────────────────────────────
  const handleDeleteAttempt = async (attemptId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this attempt?\n\nThis action cannot be undone and all files will be permanently removed."
      )
    )
      return;
    setDeletingAttemptId(attemptId);
    setDeleteError(null);
    try {
      await assignmentsApi.deleteAttempt(attemptId);
      onRefresh?.();
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Failed to delete attempt. Try again.");
    } finally {
      setDeletingAttemptId(null);
    }
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const ALLOWED_FILE_TYPES = [".doc", ".docx", ".pptx"];
  
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = "";

    // Validate file types
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of files) {
      const fileName = file.name.toLowerCase();
      const isAllowed = ALLOWED_FILE_TYPES.some(ext => fileName.endsWith(ext));
      
      if (isAllowed) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }
    
    // Show error for invalid files
    if (invalidFiles.length > 0) {
      setSubmitError(`Invalid file type(s): ${invalidFiles.join(", ")}. Only .doc, .docx, and .pptx files are allowed.`);
      setTimeout(() => setSubmitError(null), 5000);
    }

    if (!validFiles.length) return;

    const newEntries = validFiles.map((f) => ({
      _key: crypto.randomUUID(),
      file: f,
      uploading: true,
      done: false,
      id: null,
      name: f.name,
      error: null,
    }));
    setPendingFiles((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      try {
        const res = await assignmentsApi.uploadFile(entry.file, "submission");
        const uploadedFile = res.data;
        const wordCount = uploadedFile.wordCount || null;

        // Check word count against requirement
        let alertMsg = null;
        if (wordCount !== null && assignment.requiredWordCount) {
          if (wordCount < assignment.requiredWordCount) {
            alertMsg = `⚠️ Word count (${wordCount}) is below the required ${assignment.requiredWordCount} words.`;
          }
        }

        setPendingFiles((prev) =>
          prev.map((p) =>
            p._key === entry._key
              ? {
                  ...p,
                  uploading: false,
                  done: true,
                  id: uploadedFile.id,
                  name: uploadedFile.name,
                  wordCount,
                }
              : p
          )
        );

        // Store alert if there is one
        if (alertMsg) {
          setUploadAlerts((prev) => ({ ...prev, [uploadedFile.id]: alertMsg }));
        }
      } catch {
        setPendingFiles((prev) =>
          prev.map((p) =>
            p._key === entry._key
              ? { ...p, uploading: false, error: "Upload failed" }
              : p
          )
        );
      }
    }
  };

  const removeFile = (key) => {
    const file = pendingFiles.find((p) => p._key === key);
    setPendingFiles((prev) => prev.filter((p) => p._key !== key));
    if (file?.id) {
      setUploadAlerts((prev) => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
    }
  };

  // ── Submit new attempt ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const readyFiles = pendingFiles.filter((p) => p.done);
    if (!submissionText.trim() && readyFiles.length === 0) {
      setSubmitError("Please add text or upload at least one file.");
      return;
    }
    if (pendingFiles.some((p) => p.uploading)) {
      setSubmitError("Please wait for all files to finish uploading.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {};
      if (submissionText.trim()) payload.submissionText = submissionText.trim();
      if (readyFiles.length) payload.submissionFileIds = readyFiles.map((f) => f.id);
      await assignmentsApi.submit(assignment.id, payload);
      setSubmissionText("");
      setPendingFiles([]);
      setUploadAlerts({});
      setShowForm(false);
      onRefresh?.();
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <>
      <div className="space-y-3">
        {/* IQA Status Banner */}
        <div
          className={`rounded-lg border px-3 py-2 ${
            submission.iqaStatus === "IQA_PASSED"
              ? "bg-green-50 border-green-200"
              : submission.iqaStatus === "IQA_FAILED"
                ? "bg-red-50 border-red-200"
                : submission.iqaStatus === "IN_REVIEW"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${iqaMeta.cls}`}>
              {iqaMeta.label}
            </span>
            {isLocked && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🔒 Locked</span>
            )}
            <span className="text-xs text-gray-600">{IQA_DESC[submission.iqaStatus]}</span>
          </div>
        </div>

        {/* Attempts Accordion */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Submission Attempts
            <span className="ml-1.5 font-normal text-gray-400">({attempts.length})</span>
          </p>

          {attempts.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No attempts yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
              {attempts.map((attempt) => {
                const isExpanded = expandedAttemptId === attempt.id;
                const canSelectEqa =
                  attempt.isQualifiedForEqa &&
                  !attempt.studentSelect &&
                  submission.eqaStatus === "PENDING_STUDENT_CONFIRMATION";

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
                        {fmtDate(attempt.submittedAt)}
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
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">EQA</span>
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
                        {/* Submission text */}
                        {attempt.submissionText && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Content</p>
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
                                      onClick={(e) => { e.stopPropagation(); setViewFile(f); }}
                                      className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs text-[#6b1d3e] hover:bg-blue-50 transition w-full"
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

                        {/* Teacher feedback */}
                        {attempt.feedback && (
                          <div>
                            <p className="text-xs font-semibold text-amber-700 mb-1">Feedback</p>
                            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2 leading-relaxed space-y-1"
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

                        {/* Select for EQA */}
                        {canSelectEqa && (
                          <div>
                            {selectError && selectingId === attempt.id && (
                              <p className="text-xs text-red-600 mb-1">{selectError}</p>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectForEqa(attempt.id); }}
                              disabled={selectLoading && selectingId === attempt.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition disabled:opacity-50"
                            >
                              {selectLoading && selectingId === attempt.id ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Confirming…</>
                              ) : (
                                <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Select for EQA (final)</>
                              )}
                            </button>
                          </div>
                        )}

                        {attempt.studentSelect && (
                          <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2 flex items-center gap-1.5">
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                            Confirmed for EQA — submission is locked.
                          </p>
                        )}

                        {/* Delete attempt (only if no feedback) */}
                        {!attempt.feedback && !attempt.studentSelect && (
                          <div>
                            {deleteError && deletingAttemptId === attempt.id && (
                              <p className="text-xs text-red-600 mb-1">{deleteError}</p>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAttempt(attempt.id); }}
                              disabled={deletingAttemptId === attempt.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition disabled:opacity-50"
                            >
                              {deletingAttemptId === attempt.id ? (
                                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting…</>
                              ) : (
                                <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete Attempt</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* New Submission Section */}
        {!isLocked && (
          <div className="border border-dashed border-[#6b1d3e]/40 rounded-lg overflow-hidden">
            {!showForm ? (
              <button
                onClick={() => {
                  setShowForm(true);
                  setUploadAlerts({});
                }}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#6b1d3e] hover:bg-[#6b1d3e]/5 transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {attempts.length === 0 ? "Submit Assignment" : "Submit New Attempt"}
              </button>
            ) : (
              <div className="p-3 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-800">
                    {attempts.length === 0
                      ? "New Submission"
                      : `Attempt #${attempts.length + 1}`}
                  </p>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setSubmissionText("");
                      setPendingFiles([]);
                      setUploadAlerts({});
                      setSubmitError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {submitError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {submitError}
                  </p>
                )}

                {/* Text area */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Text <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    rows={2}
                    placeholder="Write your submission notes here..."
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#6b1d3e] resize-none"
                  />
                </div>

                {/* File upload */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                    Files
                  </label>

                  {/* Pending files list */}
                  {pendingFiles.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {pendingFiles.map((pf) => (
                        <div key={pf._key}>
                          <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                              pf.error
                                ? "bg-red-50 border-red-200"
                                : pf.done
                                  ? "bg-green-50 border-green-200"
                                  : "bg-blue-50 border-blue-200"
                            }`}
                          >
                            {pf.uploading ? (
                              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            ) : pf.error ? (
                              <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className={`flex-1 truncate ${pf.error ? "text-red-700" : "text-gray-700"}`}>
                              {pf.error ? `${pf.name} — ${pf.error}` : pf.name}
                            </span>
                            {pf.wordCount !== null && pf.wordCount !== undefined && !pf.uploading && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0">
                                {pf.wordCount} words
                              </span>
                            )}
                            {!pf.uploading && (
                              <button onClick={() => removeFile(pf._key)} className="text-gray-400 hover:text-red-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {/* Word count alert */}
                          {uploadAlerts[pf.id] && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                              {uploadAlerts[pf.id]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".doc,.docx,.pptx"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 transition"
                      title="Upload .doc, .docx, or .pptx files only"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      Attach Files
                    </button>
                    <p className="text-xs text-gray-400">Allowed: .doc, .docx, .pptx</p>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || pendingFiles.some((p) => p.uploading)}
                    className="flex-1 px-3 py-2 bg-[#6b1d3e] text-white text-xs font-semibold rounded hover:bg-[#5a0d38] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setSubmissionText("");
                      setPendingFiles([]);
                      setUploadAlerts({});
                      setSubmitError(null);
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isLocked && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-purple-800">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span><strong>Locked.</strong> Confirmed for EQA — no further submissions allowed.</span>
          </div>
        )}
      </div>

      {viewFile && (
        <div className="fixed inset-0 z-[70]">
          <FileViewerModal file={viewFile} onClose={() => setViewFile(null)} />
        </div>
      )}
    </>
  );
}
