import { useRef, useState } from 'react'
import TiptapEditor from './TiptapEditor'

const ALLOWED_MIME = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export default function ChatInput({ onSend, onSendFile, canUpload, disabled, members = [] }) {
  const [file, setFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [fileError, setFileError] = useState(null)
  const fileRef = useRef(null)
  const editorRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!ALLOWED_MIME.includes(selected.type)) {
      setFileError('Unsupported file type. Allowed: images, PDF, Word, PowerPoint.')
      setFile(null)
      return
    }
    setFileError(null)
    setFile(selected)
    editorRef.current?.focus()
  }

  const removeFile = () => {
    setFile(null)
    setFileError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSend = async () => {
    if (sending) return

    const html = editorRef.current?.getHTML() ?? ''
    const empty = editorRef.current?.isEmpty() ?? true

    if (empty && !file) return

    setSending(true)
    try {
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        if (!empty) fd.append('content', html)
        await onSendFile(fd)
      } else {
        await onSend(html)
      }
      editorRef.current?.clear()
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-2">
          <span className="text-lg">📎</span>
          <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
          <button
            onClick={removeFile}
            className="text-gray-400 hover:text-red-500 transition text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
      {fileError && <p className="text-xs text-red-600 mb-2 px-2">{fileError}</p>}

      <div className="flex items-end gap-2">
        {/* Editor box */}
        <div
          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5"
          onClick={() => editorRef.current?.focus()}
        >
          <TiptapEditor
            ref={editorRef}
            onSend={handleSend}
            members={members}
            showToolbar={canUpload}
            placeholder="Type a message… Use @ to mention someone"
            disabled={disabled || sending}
          />

          {/* File attach button (teachers only) */}
          {canUpload && (
            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100">
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.ppt,.pptx"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-gray-400 hover:text-[#6b1d3e] transition ml-auto"
                title="Attach file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || sending}
          style={{ backgroundColor: '#6b1d3e' }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-gray-400 mt-1.5 px-1">
        <kbd className="bg-gray-100 px-1 rounded text-gray-500">Enter</kbd> to send
        &nbsp;·&nbsp;
        <kbd className="bg-gray-100 px-1 rounded text-gray-500">Shift+Enter</kbd> for new line
        &nbsp;·&nbsp;
        <kbd className="bg-gray-100 px-1 rounded text-gray-500">@</kbd> to mention
      </p>
    </div>
  )
}

