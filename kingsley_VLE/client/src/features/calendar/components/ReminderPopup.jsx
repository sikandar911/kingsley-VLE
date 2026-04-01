const TYPE_COLORS = {
  assignment: {
    badge: 'bg-amber-100 text-amber-800',
    icon: '📋',
    label: 'Assignment',
  },
  event: {
    badge: 'bg-violet-100 text-violet-800',
    icon: '📅',
    label: 'Event',
  },
}

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

export default function ReminderPopup({ reminders = [], dateStr, onClose }) {
  if (!reminders.length) return null

  const displayDate = dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Reminders</h3>
            <p className="text-xs text-gray-500 mt-0.5">{displayDate}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto divide-y divide-gray-100">
          {reminders.map((r) => {
            const tc = TYPE_COLORS[r.type] || TYPE_COLORS.event
            return (
              <div key={r.id} className="px-5 py-3.5">
                {/* Name + badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-gray-800 leading-snug">
                    {tc.icon} {r.name}
                  </span>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${tc.badge}`}>
                    {tc.label}
                  </span>
                </div>

                {/* Assignment details */}
                {r.type === 'assignment' && r.assignment && (
                  <div className="text-xs text-gray-600 space-y-0.5 mt-2">
                    {r.assignment.course && (
                      <p>📚 <span className="font-medium">Course:</span> {r.assignment.course.title}</p>
                    )}
                    {r.assignment.section && (
                      <p>🏫 <span className="font-medium">Section:</span> {r.assignment.section.name}</p>
                    )}
                    {r.assignment.dueDate && (
                      <p>⏰ <span className="font-medium">Due:</span> {fmt(r.assignment.dueDate)}</p>
                    )}
                    {r.assignment.totalMarks && (
                      <p>💯 <span className="font-medium">Marks:</span> {r.assignment.totalMarks}</p>
                    )}
                    {r.assignment.status && (
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.assignment.status === 'published' ? 'bg-green-100 text-green-700' :
                        r.assignment.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.assignment.status}
                      </span>
                    )}
                  </div>
                )}

                {/* Event details */}
                {r.type === 'event' && r.event && (
                  <div className="text-xs text-gray-600 space-y-0.5 mt-2">
                    {r.event.startTime && (
                      <p>🕐 <span className="font-medium">Start:</span> {fmt(r.event.startTime)}</p>
                    )}
                    {r.event.endTime && (
                      <p>🕔 <span className="font-medium">End:</span> {fmt(r.event.endTime)}</p>
                    )}
                  </div>
                )}

                {/* Color dot indicator */}
                {r.event?.color && (
                  <span
                    className="inline-block w-3 h-3 rounded-full mt-1"
                    style={{ backgroundColor: r.event.color }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
