import { useState } from "react";
import api from "../../../lib/api";
import FileViewerModal from "../../courseChat/components/FileViewerModal";

/**
 * SecureFileLink
 *
 * Renders a link/button for a class material.
 *
 * - If the material has a fileId (Azure Blob upload):
 *     On click -> opens FileViewerModal popup.
 * - If the material has a plain fileUrl (external URL):
 *     Behaves like a normal <a> link.
 *
 * Props:
 *   material   - the class material object (needs .fileId, .fileUrl, .file?.fileUrl)
 *   className  - extra CSS classes for the rendered element
 *   style      - inline styles
 *   children   - button / link label content
 */
export default function SecureFileLink({ material, className = "", style = {}, children }) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Determine mode: azure file upload vs plain URL
  const fileId = material?.fileId;
  const plainUrl = material?.fileUrl || material?.file?.fileUrl || null;

  const isAzureFile = Boolean(fileId);

  const handleClick = (e) => {
    if (!isAzureFile) return;
    e.preventDefault();
    setIsViewerOpen(true);
  };

  // Nothing to render if there is no source at all
  if (!isAzureFile && !plainUrl) return null;

  const fileData = isAzureFile ? {
    fileId: fileId,
    fileUrl: plainUrl,
    name: material?.file?.name || material?.title || "Document"
  } : null;

  if (isAzureFile) {
    return (
      <span>
        <button
          type="button"
          onClick={handleClick}
          className={className}
          style={style}
          title="View File"
        >
          {children}
        </button>
        {isViewerOpen && fileData && (
          <FileViewerModal 
            file={fileData} 
            onClose={() => setIsViewerOpen(false)} 
          />
        )}
      </span>
    );
  }

  // Plain external URL
  return (
    <a
      href={plainUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      title="Open URL"
    >
      {children}
    </a>
  );
}

/**
 * getMaterialSource(material)
 *
 * Returns { type: 'file'|'url'|null, fileId, url }
 * Helper used by pages that need to know what kind of source a material has.
 */
export function getMaterialSource(material) {
  if (material?.fileId) {
    return { type: "file", fileId: material.fileId, url: null };
  }
  const url = material?.fileUrl || material?.file?.fileUrl || null;
  if (url) return { type: "url", fileId: null, url };
  return { type: null, fileId: null, url: null };
}
