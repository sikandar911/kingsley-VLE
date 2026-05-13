import { useState } from "react";
import { fmt } from "../utils/helpers";
import { assignmentsApi } from "../../../../features/assignments/api/assignments.api";
import FileUploadZone from "../../../../features/assignments/components/FileUploadZone";

export default function SubmitModal({
  assignment,
  onClose,
  onSubmit,
  submitting,
}) {
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFilesChange = (files) => {
    setUploadedFiles(files);
  };

  // Validation: Can delete file only if more than 1 file remains
  const canDeleteFile = (fileId, remainingCount) => {
    return remainingCount > 0; // At least 1 must remain after deletion
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation: at least 1 file must be present
    if (uploadedFiles.length === 0) {
      alert("Please upload at least 1 file before submitting.");
      return;
    }

    // Transform uploaded files array to submissionFileIds array
    const submissionFileIds = uploadedFiles.map((f) => f.id);
    onSubmit(assignment, { notes, submissionFileIds });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Submit Assignment</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            disabled={submitting}
          >
            <svg
              className="w-5 h-5 text-gray-500"
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

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-800">
            {assignment?.title}
          </p>
          {assignment?.dueDate && (
            <p className="text-xs text-gray-500 mt-0.5">
              Due: {fmt(assignment.dueDate)}
            </p>
          )}
        </div>

        {/* First attempt info banner */}
        {(!assignment?.submissions || assignment.submissions.length === 0) && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-blue-800">First Attempt</p>
              <p className="text-xs text-blue-700 mt-0.5">After submitting, please wait for your teacher's feedback before submitting again.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach File <span className="text-red-500">*</span>{" "}
              <span className="text-gray-400 text-xs">
                (Required - One .docx file per submission)
              </span>
            </label>
            <FileUploadZone
              fileType="submission"
              uploadedFiles={uploadedFiles}
              onFilesChange={handleFilesChange}
              maxFiles={1}
              maxTotalFiles={1}
              disabled={uploading || submitting}
              canDeleteFile={canDeleteFile}
            />
            {/* Word count display */}
            {uploadedFiles.length > 0 && uploadedFiles[0]?.wordCount != null && (
              <div className="mt-2">
                <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
                  assignment?.requiredWordCount
                    ? uploadedFiles[0].wordCount >= assignment.requiredWordCount
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {uploadedFiles[0].wordCount.toLocaleString()} words
                  {assignment?.requiredWordCount ? ` / ${assignment.requiredWordCount.toLocaleString()} required` : ""}
                </span>
                {assignment?.requiredWordCount && uploadedFiles[0].wordCount < assignment.requiredWordCount && (
                  <p className="text-xs text-red-600 mt-1">⚠ Word count is below the required minimum.</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any comments or notes for your submission..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b1d3e]/30 focus:border-[#6b1d3e]"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || uploading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              style={{ backgroundColor: "#6b1d3e" }}
              className="flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
