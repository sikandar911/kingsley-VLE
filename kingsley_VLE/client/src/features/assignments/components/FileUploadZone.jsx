import { useRef, useState } from "react";
import { assignmentsApi } from "../api/assignments.api";

// File type and size restrictions
const ACCEPT = ".pdf,.docx,.pptx";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
};

function FileIcon({ name = "" }) {
  const ext = name.split(".").pop().toLowerCase();
  const colors = {
    pdf: "text-red-500",
    docx: "text-blue-500",
    pptx: "text-orange-500",
  };
  return (
    <svg
      className={`w-5 h-5 flex-shrink-0 ${colors[ext] || "text-gray-500"}`}
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
  );
}

/**
 * FileUploadZone — drag-drop + click to upload files.
 * Props:
 *   fileType: 'assignment' | 'submission'  (default 'assignment')
 *   uploadedFiles: [{ id, name, fileUrl }]  — controlled list
 *   onFilesChange: (files) => void          — called with updated list
 *   maxFiles: number (default 10)           — max files allowed to upload
 *   maxTotalFiles: number (default null)    — max total files (for better error message)
 *   disabled: boolean
 *   existingFiles: [{ id, name, fileUrl }]  — existing files that can't be deleted without new files (edit mode)
 *   canDeleteFile: (fileId, totalRemainingCount) => boolean  — optional validation for file deletion
 */
export default function FileUploadZone({
  fileType = "assignment",
  uploadedFiles = [],
  onFilesChange,
  maxFiles = 10,
  maxTotalFiles = null,
  disabled = false,
  existingFiles = [],
  canDeleteFile = null,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFiles = async (rawFiles) => {
    if (!rawFiles || rawFiles.length === 0) return;
    if (uploadedFiles.length + rawFiles.length > maxFiles) {
      // Use maxTotalFiles for better error context if provided
      const limit = maxTotalFiles || maxFiles;
      setUploadError(
        `Maximum submission file limit is ${limit} files. You can upload ${maxFiles - uploadedFiles.length} more.`,
      );
      return;
    }

    setUploadError("");
    const filesToUpload = Array.from(rawFiles);

    // Validate all files first
    for (const file of filesToUpload) {
      if (!ALLOWED_TYPES[file.type]) {
        setUploadError(
          `File type not allowed: ${file.name}. Only PDF, DOCX, and PPTX files are accepted.`,
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(
          `File size must be under 2 MB: ${file.name} is ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
        );
        return;
      }
    }

    setUploading(true);
    try {
      const results = await Promise.all(
        filesToUpload.map((f) => assignmentsApi.uploadFile(f, fileType)),
      );
      const newFiles = results.map((r) => r.data);
      onFilesChange([...uploadedFiles, ...newFiles]);

      // Reset file input value to allow re-selecting the same file
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (id) => {
    // Check if deletion is allowed using the optional validator
    if (canDeleteFile) {
      const remainingCount = uploadedFiles.length - 1;
      if (!canDeleteFile(id, remainingCount)) {
        setUploadError(
          "Cannot delete this file. Upload a new file first, or ensure at least 1 file remains.",
        );
        return;
      }
    }
    onFilesChange(uploadedFiles.filter((f) => f.id !== id));

    // Reset file input to allow re-selecting the same file
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
          ${dragging ? "border-[#6b1142] bg-pink-50" : "border-gray-300 hover:border-[#6b1142] hover:bg-gray-50"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#6b1142] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-[#6b1142]">
                Click to upload
              </span>{" "}
              or drag & drop
            </p>
            <p className="text-xs text-gray-400">
              PDF, Word (.docx), PowerPoint (.pptx) - Max {maxFiles} files, 2 MB
              each
            </p>
          </div>
        )}
      </div>

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((f) => {
            const totalFiles = uploadedFiles.length;
            const canDelete =
              !canDeleteFile || canDeleteFile(f.id, totalFiles - 1);
            const deleteTitle = !canDelete
              ? "Cannot delete the only file. Upload a new file first."
              : "Remove";

            return (
              <li
                key={f.id}
                className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              >
                <FileIcon name={f.name} />
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {f.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  disabled={disabled || !canDelete}
                  className={`transition flex-shrink-0 ${
                    canDelete
                      ? "text-gray-400 hover:text-red-500"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                  title={deleteTitle}
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
