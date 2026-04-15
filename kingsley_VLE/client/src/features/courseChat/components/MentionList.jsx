import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const MentionList = forwardRef(function MentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index) => {
    const item = items[index]
    if (item) {
      command({ id: item.id, label: item.name })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { upHandler(); return true }
      if (event.key === 'ArrowDown') { downHandler(); return true }
      if (event.key === 'Enter') { enterHandler(); return true }
      return false
    },
  }))

  if (!items.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg py-2 px-3 text-sm text-gray-400 min-w-[160px]">
        No members found
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px] max-h-52 overflow-y-auto z-50">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => selectItem(index)}
          className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition ${
            index === selectedIndex
              ? 'bg-[#6b1d3e]/10 text-[#6b1d3e]'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {/* Mini avatar */}
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: item.role === 'teacher' ? '#6b1d3e' : '#9ca3af' }}
          >
            {item.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium truncate flex-1">{item.name}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              item.role === 'teacher'
                ? 'bg-[#6b1d3e]/10 text-[#6b1d3e]'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {item.role}
          </span>
        </button>
      ))}
    </div>
  )
})

export default MentionList
