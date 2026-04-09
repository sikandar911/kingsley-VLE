import ReactionPicker from './ReactionPicker'

const REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'unlike', emoji: '👎' },
  { type: 'love', emoji: '❤️' },
  { type: 'ok', emoji: '✅' },
  { type: 'done', emoji: '🎉' },
]

const FILE_ICONS = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  ppt: '📊',
  pptx: '📊',
  xls: '📊',
  xlsx: '📊',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  gif: '🖼️',
  default: '📎',
}

function getFileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase()
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

  const handleDownload = () => {
    if (!message.classMaterial?.id) return
    // Use the download endpoint which goes through the server/auth
    window.location.href = `/api/class-materials/${message.classMaterial.id}/download`
  }

  return (
    <div
      className={`flex gap-3 group ${isNew ? 'animate-fade-in' : ''}`}
    >
      {/* Avatar */}
      <div
        style={{ backgroundColor: '#6b1d3e' }}
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold mt-0.5"
      >
        {getAvatarLetter(message.user)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name + timestamp */}
        <div className="flex items-baseline gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-gray-900">
            {getDisplayName(message.user)}
          </span>
          <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
        </div>

        {/* Message text */}
        {message.content && (
          <p className="text-sm text-gray-800 leading-relaxed">{message.content}</p>
        )}

        {/* File attachment */}
        {message.classMaterial && (
          <div className="mt-2 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 max-w-xs">
            <span className="text-2xl">{getFileIcon(message.classMaterial.file?.name || '')}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {message.classMaterial.title || message.classMaterial.file?.name}
              </p>
              <p className="text-xs text-gray-400">Class Material</p>
            </div>
            {message.classMaterial.id && (
              <button
                onClick={handleDownload}
                style={{ backgroundColor: '#6b1d3e' }}
                className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition"
              >
                Download
              </button>
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
  )
}
