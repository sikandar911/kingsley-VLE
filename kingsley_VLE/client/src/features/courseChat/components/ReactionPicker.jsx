import { useState, useRef, useEffect } from 'react'

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'unlike', emoji: '👎', label: 'Unlike' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'ok', emoji: '✅', label: 'OK' },
  { type: 'done', emoji: '🎉', label: 'Done' },
]

export default function ReactionPicker({ onSelect, currentReaction }) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const ref = useRef(null)
  const popupRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Check popup position and adjust alignment if it goes off-screen left
  useEffect(() => {
    if (!open || !popupRef.current) return

    const timer = setTimeout(() => {
      const popup = popupRef.current
      if (!popup) return

      const rect = popup.getBoundingClientRect()
      // If popup goes off-screen to the left, align to the right of the button instead
      if (rect.left < 0) {
        setAlignRight(true)
      } else {
        setAlignRight(false)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
        title="React"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {open && (
        <div
          ref={popupRef}
          className={`absolute bottom-full mb-1 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-1 z-50 ${
            alignRight ? 'left-full ml-1' : 'right-full mr-1'
          }`}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => { onSelect(r.type); setOpen(false) }}
              className={`text-xl p-1.5 rounded-xl transition hover:bg-gray-100 hover:scale-125 flex-shrink-0 ${
                currentReaction === r.type ? 'bg-[#6b1d3e]/10 ring-2 ring-[#6b1d3e]' : ''
              }`}
              title={r.label}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
