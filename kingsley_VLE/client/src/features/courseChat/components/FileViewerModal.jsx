import { useEffect, useRef, useState } from "react";
import api from "../../../lib/api";

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];
const PDF_EXTS = ["pdf"];
const OFFICE_EXTS = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];

function getExt(name = "") {
  return name.split(".").pop().toLowerCase();
}

function getFileType(name = "") {
  const ext = getExt(name);
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (PDF_EXTS.includes(ext)) return "pdf";
  if (OFFICE_EXTS.includes(ext)) return "office";
  return "unknown";
}

function ExtBadge({ name }) {
  const ext = getExt(name).toUpperCase();
  const colors = {
    PDF: "bg-red-100 text-red-700",
    DOC: "bg-blue-100 text-blue-700",
    DOCX: "bg-blue-100 text-blue-700",
    PPT: "bg-orange-100 text-orange-700",
    PPTX: "bg-orange-100 text-orange-700",
    XLS: "bg-green-100 text-green-700",
    XLSX: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[ext] || "bg-gray-100 text-gray-600"}`}
    >
      {ext}
    </span>
  );
}

export default function FileViewerModal({ file, onClose }) {
  const overlayRef = useRef(null);
  const fileType = getFileType(file.name);
  const [secureUrl, setSecureUrl] = useState(file.fileUrl || null);
  const [loading, setLoading] = useState(!!file.fileId);
  const [error, setError] = useState(null);
  const [viewerKey, setViewerKey] = useState(0);

  const handleReloadViewer = () => {
    setViewerKey((prev) => prev + 1);
  };

  // Fetch secure SAS URL if fileId is provided
  useEffect(() => {
    if (!file.fileId) return;

    const fetchSecureUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/files/${file.fileId}/secure-url`);
        const nextUrl = res.data?.url || null;
        setSecureUrl(nextUrl);
        if (!nextUrl) {
          setError("No secure URL was returned for this file.");
        }
      } catch (err) {
        console.error("Error fetching secure URL:", err);
        setError("Failed to load file. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSecureUrl();
  }, [file.fileId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDownload = () => {
    if (!secureUrl) return;
    const a = document.createElement("a");
    a.href = secureUrl;
    a.download = file.name || "download";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Office viewer URL (Google Docs Viewer instead of view.officeapps.live.com)
  const officeViewerSrc = secureUrl
    ? `https://docs.google.com/gview?url=${encodeURIComponent(secureUrl)}&embedded=true`
    : null;
  // Google Docs viewer as fallback / for PDFs too
  const googleViewerSrc = secureUrl
    ? `https://docs.google.com/gview?url=${encodeURIComponent(secureUrl)}&embedded=true`
    : null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div
        className="relative flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: "min(92vw, 900px)", height: "min(90vh, 680px)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <ExtBadge name={file.name} />
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
            {file.name}
          </span>

          {/* Reload button (useful for Google Docs viewer glitches or blank PDFs) */}
          <button
            onClick={handleReloadViewer}
            disabled={loading || !secureUrl}
            title="Reload Preview"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reload
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={loading || !secureUrl}
            title="Download"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#6b1d3e" }}
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition flex-shrink-0"
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

        {/* Viewer body */}
        <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#6b1d3e] mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading file...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-8">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition"
                style={{ backgroundColor: "#6b1d3e" }}
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && fileType === "image" && secureUrl && (
            <img
              key={`img-${viewerKey}`}
              src={secureUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          )}

          {!loading && !error && fileType === "pdf" && secureUrl && (
            <object
              key={`pdf-${viewerKey}`}
              data={secureUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <iframe
                src={secureUrl}
                title={file.name}
                className="w-full h-full border-0"
                allow="fullscreen"
              />
            </object>
          )}

          {!loading && !error && fileType === "office" && officeViewerSrc && (
            <iframe
              key={`office-${viewerKey}`}
              src={officeViewerSrc}
              title={file.name}
              className="w-full h-full border-0"
              allow="fullscreen"
            />
          )}

          {!loading && !error && fileType === "unknown" && (
            <div className="text-center p-8">
              <div className="text-5xl mb-3">📎</div>
              <p className="text-gray-600 text-sm mb-4">
                Preview not available for this file type.
              </p>
              <button
                onClick={handleDownload}
                disabled={!secureUrl}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#6b1d3e" }}
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
