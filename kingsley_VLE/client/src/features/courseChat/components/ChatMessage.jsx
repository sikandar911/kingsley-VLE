import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import ReactionPicker from './ReactionPicker'
import FileViewerModal from './FileViewerModal'

const REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'unlike', emoji: '👎' },
  { type: 'love', emoji: '❤️' },
  { type: 'ok', emoji: '✅' },
  { type: 'done', emoji: '🎉' },
]

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']

const FILE_ICONS = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  ppt: '📊',
  pptx: '📊',
  xls: '📊',
  xlsx: '📊',
  default: '📎',
}

function getExt(name = '') {
  return name.split('.').pop().toLowerCase()
}

function isImage(name = '') {
  return IMAGE_EXTS.includes(getExt(name))
}

function getFileIcon(name = '') {
  const ext = getExt(name)
  return FILE_ICONS[ext] || FILE_ICONS.default
}

function getDisplayName(user) {
  return (
    user?.teacherProfile?.fullName ||
    user?.studentProfile?.fullName ||
    user?.email ||
    'Unknown'
  )
}

function getAvatarLetter(user) {
  const name = getDisplayName(user)
  return name.charAt(0).toUpperCase()
}

function isTeacher(user) {
  return user?.role === 'teacher'
}

function getReactionGroups(reactions) {
  const groups = {}
  for (const r of reactions) {
    if (!groups[r.type]) groups[r.type] = []
    groups[r.type].push(r)
  }
  return groups
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function ChatMessage({ message, currentUserId, onReact, onDelete, isNew }) {
  const reactionGroups = getReactionGroups(message.reactions || [])
  const myReaction = message.reactions?.find((r) => r.userId === currentUserId)?.type || null
  const isOwner = message.userId === currentUserId
  const teacher = isTeacher(message.user)

  const [viewerFile, setViewerFile] = useState(null)
  const [inlineSecureUrl, setInlineSecureUrl] = useState(null)

  const material = message.classMaterial
  const fileName = material?.file?.name || material?.title || ''
  const fileUrl = material?.file?.fileUrl || ''
  const fileId = material?.file?.id || ''
  const fileIsImage = isImage(fileName)

  useEffect(() => {
    if (!fileIsImage || !fileId) {
      setInlineSecureUrl(null)
      return
    }

    let cancelled = false

    const loadInlineSecureUrl = async () => {
      try {
        const res = await api.get(`/files/${fileId}/secure-url`)
        if (!cancelled) {
          setInlineSecureUrl(res.data?.url || null)
        }
      } catch (err) {
        if (!cancelled) {
          setInlineSecureUrl(null)
        }
      }
    }

    loadInlineSecureUrl()

    return () => {
      cancelled = true
    }
  }, [fileId, fileIsImage])

  const openViewer = () => {
    if (!fileId) return
    setViewerFile({
      name: fileName,
      fileId, // Pass fileId so FileViewerModal can fetch secure URL
      fileUrl, // Keep plain URL as fallback
    })
  }

  const handleDownload = () => {
    if (!material?.id) return
    const a = document.createElement('a')
    a.href = `/api/class-materials/${material.id}/download`
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <>
      <div className={`flex gap-3 group ${isNew ? 'animate-fade-in' : ''}`}>
        {/* Avatar */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div
            style={{ backgroundColor: teacher ? '#6b1d3e' : '#9ca3af' }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
          >
            {getAvatarLetter(message.user)}
          </div>
          {/* Teacher crown badge */}
          {teacher && (
            <div
              title="Teacher"
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundColor: '#f59e0b' }}
            >
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + timestamp */}
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className={`text-sm font-semibold ${teacher ? 'text-[#6b1d3e]' : 'text-gray-900'}`}>
              {getDisplayName(message.user)}
            </span>
            <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
          </div>

          {/* Message text */}
          {message.content && (
            <p className="text-sm text-gray-800 leading-relaxed">{message.content}</p>
          )}

          {/* File attachment */}
          {material && (
            <div className="mt-2">
              {fileIsImage && (inlineSecureUrl || fileUrl) ? (
                /* ── Image thumbnail ── */
                <div
                  className="relative inline-block cursor-pointer group/img"
                  onClick={openViewer}
                >
                  <img
                    src={inlineSecureUrl || fileUrl}
                    alt={fileName}
                    className="rounded-xl object-cover border border-gray-200 hover:opacity-90 transition shadow-sm"
                    style={{ maxWidth: '220px', maxHeight: '160px', minWidth: '80px', minHeight: '60px' }}
                    loading="lazy"
                  />
                  {/* Overlay hint */}
                  <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/img:bg-black/20 transition flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white opacity-0 group-hover/img:opacity-100 transition drop-shadow"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </div>
              ) : (
                /* ── Non-image file card ── */
                <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-w-xs">
                  <span className="text-2xl">{getFileIcon(fileName)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {material.title || fileName}
                    </p>
                    <p className="text-xs text-gray-400">Class Material</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {fileUrl && (
                      <button
                        onClick={openViewer}
                        title="View"
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#6b1d3e] hover:bg-gray-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                    {material.id && (
                      <button
                        onClick={handleDownload}
                        title="Download"
                        style={{ backgroundColor: '#6b1d3e' }}
                        className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition"
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing reactions */}
          {Object.keys(reactionGroups).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {REACTIONS.filter((r) => reactionGroups[r.type]).map((r) => (
                <button
                  key={r.type}
                  onClick={() => onReact(message.id, r.type)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    myReaction === r.type
                      ? 'bg-[#6b1d3e]/10 text-[#6b1d3e] ring-1 ring-[#6b1d3e]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r.emoji}
                  <span>{reactionGroups[r.type].length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover actions */}
        <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
          <ReactionPicker onSelect={(type) => onReact(message.id, type)} currentReaction={myReaction} />
          {isOwner && (
            <button
              onClick={() => onDelete(message.id)}
              className="text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50"
              title="Delete message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* File viewer modal */}
      {viewerFile && (
        <FileViewerModal
          file={viewerFile}
          onClose={() => setViewerFile(null)}
        />
      )}
    </>
  )
}
