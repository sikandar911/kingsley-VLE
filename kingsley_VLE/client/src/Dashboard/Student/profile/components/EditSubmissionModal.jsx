import { useState } from "react";
import { assignmentsApi } from "../../../../features/assignments/api/assignments.api";
import FileUploadZone from "../../../../features/assignments/components/FileUploadZone";
import FileViewerModal from "../../../../features/courseChat/components/FileViewerModal";

export default function EditSubmissionModal({
  assignment,
  submission,
  onClose,
  onSubmit,
  isOverdue,
  isGraded,
}) {
  const [notes, setNotes] = useState(submission?.submissionText || "");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [deletedExistingFileIds, setDeletedExistingFileIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [viewFile, setViewFile] = useState(null);

  const canEdit = !isOverdue && !isGraded;
  const existingFiles = submission?.submissionFiles || [];
  const remainingExistingFiles = existingFiles.filter(
    (f) => !deletedExistingFileIds.includes(f.id),
  );
  const totalFiles = remainingExistingFiles.length + uploadedFiles.length;

  // Calculate how many NEW files can be uploaded (5 total max - existing remaining files)
  const maxFilesForUpload = Math.max(0, 5 - remainingExistingFiles.length);

  // Helper: Check if we can delete a file
  // Rule: If total files > 1, can delete any file. Must keep at least 1.
  const canDeleteFile = (fileId) => {
    // Can delete if total files > 1 (will still have at least 1 left)
    return totalFiles > 1;
  };

  // Handle deletion of existing file
  const handleDeleteExistingFile = (fileId) => {
    if (!canDeleteFile(fileId)) {
      setError("Cannot delete the only file. At least 1 file must remain.");
      return;
    }
    setError("");
    setDeletedExistingFileIds([...deletedExistingFileIds, fileId]);
  };

  // Handle recovery of deleted file
  const handleRecoverDeletedFile = (fileId) => {
    setDeletedExistingFileIds(
      deletedExistingFileIds.filter((id) => id !== fileId),
    );
    setError("");
  };

  // Handle new files from upload zone
  const handleFilesChange = (files) => {
    setUploadedFiles(files);
    setError("");
    // DO NOT clear deletedExistingFileIds - user may have marked files for deletion
    // and is now adding new files alongside them
  };

  // Validation function for FileUploadZone - validates if newly uploaded files can be deleted
  const validateCanDeleteFile = (fileId, remainingNewFiles) => {
    // Check total files after this deletion
    const totalAfterDelete = remainingNewFiles + remainingExistingFiles.length;

    // Can delete if total will still be > 0 (i.e., at least 1 remains)
    // Which means: totalAfterDelete >= 1, or equivalently totalFiles - 1 >= 1
    // Which means: totalFiles > 1
    return totalFiles > 1;
  };

  const handleSubmit = async () => {
    if (!canEdit) return;

    // Validation: at least 1 file must remain
    if (totalFiles === 0) {
      setError("At least 1 file must be present. Cannot delete all files.");
      return;
    }

    // Validation: at least 1 file or notes must be changed
    const notesChanged = notes !== submission?.submissionText;
    const filesChanged =
      uploadedFiles.length > 0 || deletedExistingFileIds.length > 0;

    if (!notesChanged && !filesChanged) {
      setError("No changes made");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const payload = {};

      // Include notes if changed
      if (notesChanged) {
        payload.submissionText = notes || null;
      }

      // Include files if changed
      if (filesChanged) {
        if (uploadedFiles.length > 0) {
          // New files uploaded - merge with remaining existing files (keep both)
          const newFileIds = uploadedFiles.map((f) => f.id);
          const remainingExistingFileIds = remainingExistingFiles.map(
            (f) => f.id,
          );
          payload.submissionFileIds = [
            ...newFileIds,
            ...remainingExistingFileIds,
          ];
        } else if (deletedExistingFileIds.length > 0) {
          // Only deleting existing files (no new files)
          // Send the remaining file IDs
          payload.submissionFileIds = remainingExistingFiles.map((f) => f.id);
        }
      }

      if (Object.keys(payload).length === 0) {
        setError("No changes made");
        setUploading(false);
        return;
      }

      await assignmentsApi.updateSubmission(submission.id, payload);
      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update submission");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {viewFile && (
        <div className="fixed inset-0 z-[60]">
          <FileViewerModal file={viewFile} onClose={() => setViewFile(null)} />
        </div>
      )}

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-gray-900">Edit Submission</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Close"
            >
              <svg
                className="w-5 h-5"
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
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
            {/* Assignment title */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {assignment.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {!canEdit && isGraded && "This submission has been graded"}
                {!canEdit &&
                  isOverdue &&
                  "Editing is not allowed after due date"}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Current submission files */}
            {existingFiles.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase">
                    Current Files ({remainingExistingFiles.length}/
                    {existingFiles.length})
                  </p>
                  {uploadedFiles.length > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      ({totalFiles} total) - You can delete or keep existing
                      files
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {/* Active files */}
                  {remainingExistingFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between bg-white rounded p-3 border border-gray-200"
                    >
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setViewFile(file)}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate hover:underline">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">Click to view</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingFile(file.id)}
                        disabled={!canEdit || !canDeleteFile(file.id)}
                        className={`ml-3 px-2 py-1 text-xs rounded transition ${
                          canDeleteFile(file.id)
                            ? "text-red-600 hover:bg-red-50 border border-red-200"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
                        title={
                          !canDeleteFile(file.id)
                            ? "Cannot delete the only file. At least 1 file must remain."
                            : "Delete file"
                        }
                      >
                        Delete
                      </button>
                    </div>
                  ))}

                  {/* Marked for deletion files */}
                  {deletedExistingFileIds.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2 font-medium">
                        Marked for deletion ({deletedExistingFileIds.length}):
                      </p>
                      {existingFiles
                        .filter((f) => deletedExistingFileIds.includes(f.id))
                        .map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between bg-red-50 rounded p-2 border border-red-200 mb-1"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <svg
                                className="w-4 h-4 text-red-500 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-xs text-red-700 truncate">
                                {file.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRecoverDeletedFile(file.id)}
                              className="text-xs text-red-600 hover:text-red-800 underline whitespace-nowrap ml-2"
                            >
                              Undo
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Newly uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-xs font-semibold text-green-700 uppercase mb-3">
                  New Files ({uploadedFiles.length})
                </p>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 bg-white rounded p-2 border border-green-100"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-green-600">
                          Ready to upload
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* <p className="text-xs text-green-700 mt-2">
                  ✓ You can now delete existing files, or keep them
                </p> */}
              </div>
            )}

            {/* File upload zone (only if can edit) */}
            {canEdit && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                  Upload Files
                  {/* <span className="text-gray-400 text-xs ml-1">
                    ({remainingExistingFiles.length} existing + {uploadedFiles.length} new = {totalFiles}/5)
                    {maxFilesForUpload > 0 ? ` - Can add ${maxFilesForUpload} more` : " - Cannot add more files"}
                  </span> */}
                </p>

                {maxFilesForUpload === 0 && (
                  <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs px-3 py-2 rounded-lg mb-3">
                    ⚠️ File limit reached (5/5). Delete some existing files to
                    upload new ones.
                  </div>
                )}

                <FileUploadZone
                  fileType="submission"
                  uploadedFiles={uploadedFiles}
                  onFilesChange={handleFilesChange}
                  maxFiles={maxFilesForUpload}
                  maxTotalFiles={5}
                  disabled={uploading || maxFilesForUpload === 0}
                  canDeleteFile={validateCanDeleteFile}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                Notes / Description {!canEdit && "(Read Only)"}
              </label>
              <textarea
                value={notes}
                onChange={(e) => canEdit && setNotes(e.target.value)}
                disabled={!canEdit}
                placeholder="Add any notes about your submission..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b1142] disabled:bg-gray-50 disabled:text-gray-500 min-h-[100px] resize-none"
              />
            </div>

            {/* Marks section (if graded) */}
            {isGraded && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-3">
                <p className="text-xs font-semibold text-blue-700 uppercase">
                  Grading Details
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {submission?.marks !== null &&
                    submission?.marks !== undefined && (
                      <div>
                        <p className="text-xs text-blue-600 mb-1">Marks</p>
                        <p className="text-lg font-bold text-blue-900">
                          {submission.marks} / {assignment.totalMarks}
                        </p>
                      </div>
                    )}
                  {submission?.gradeLetter && (
                    <div>
                      <p className="text-xs text-blue-600 mb-1">Grade</p>
                      <p className="text-lg font-bold text-blue-900">
                        {submission.gradeLetter}
                      </p>
                    </div>
                  )}
                  {submission?.markedAt && (
                    <div>
                      <p className="text-xs text-blue-600 mb-1">Graded On</p>
                      <p className="text-xs text-blue-900">
                        {new Date(submission.markedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                {submission?.feedback && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-1">
                      Teacher Feedback
                    </p>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">
                      {submission.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Close
            </button>
            {canEdit && (
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="px-4 py-2.5 bg-[#6b1142] text-white rounded-lg text-sm font-medium hover:bg-[#5a0d38] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploading ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
