const TYPE_COLORS = {
  assignment: {
    badge: "bg-amber-100 text-amber-800",
    icon: "📋",
    label: "Assignment",
  },
  event: {
    badge: "bg-violet-100 text-violet-800",
    icon: "📅",
    label: "Event",
  },
};

// Format datetime keeping UTC date but showing local time
// This prevents timezone shifts from changing which date the event is on
const fmt = (d) => {
  if (!d) return null;

  // Convert to string if it's a Date object
  const dateStr = d instanceof Date ? d.toISOString() : String(d);

  // Extract UTC date from ISO string (YYYY-MM-DD part before T)
  const utcDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!utcDateMatch) return null;

  const [, year, month, day] = utcDateMatch;
  const monthNum = parseInt(month) - 1;
  const dayNum = parseInt(day);

  // Format time in local timezone
  const date = new Date(d);
  const timeStr = date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Get month name
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = monthNames[monthNum];

  return `${monthName} ${dayNum}, ${year}, ${timeStr}`;
};

export default function ReminderPopup({ reminders = [], dateStr, onClose }) {
  if (!reminders.length) return null;

  // Use the clicked calendar date (dateStr) for the header
  // This is the date the user clicked on, not derived from event times
  // Extract UTC date directly to prevent timezone shifts
  const displayDate = dateStr
    ? (() => {
        const utcDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!utcDateMatch) return "";

        const [, year, month, day] = utcDateMatch;
        const monthNum = parseInt(month) - 1;
        const dayNum = parseInt(day);
        const yearNum = parseInt(year);

        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const monthName = monthNames[monthNum];

        // Create a date in UTC to get the correct day of week
        const utcDate = new Date(Date.UTC(yearNum, monthNum, dayNum));
        const dayOfWeek = utcDate.toLocaleDateString("en-US", {
          weekday: "long",
        });

        return `${dayOfWeek}, ${monthName} ${dayNum}, ${year}`;
      })()
    : "";

  return (
    <div
      className="fixed  inset-0 z-[200] flex items-center justify-center p-4 lg:inset-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-[393px] lg:p-0 lg:pointer-events-none lg:items-center lg:justify-end"
      onClick={onClose}
    >
      <div
        className="bg-[#fdedf5] rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden lg:pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 bg-[#891754]  py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm text-white font-bold text-gray-900">
              Reminders
            </h3>
            <p className="text-xs text-white mt-0.5">{displayDate}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center  text-white text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto divide-y divide-gray-100">
          {reminders.map((r) => {
            const tc = TYPE_COLORS[r.type] || TYPE_COLORS.event;
            return (
              <div key={r.id} className="px-5 py-3.5">
                {/* Name + badge */}
                <div className=" flex flex-col-reverse md:flex-row items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-gray-800 leading-snug">
                    {tc.icon} {r.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${tc.badge}`}
                  >
                    {tc.label}
                  </span>
                </div>

                {/* Assignment details */}
                {r.type === "assignment" && r.assignment && (
                  <div className="text-xs text-gray-600 space-y-1 mt-2 ">
                    {r.assignment.course && (
                      <p>
                        📚 <span className="font-medium">Course:</span>{" "}
                        {r.assignment.course.title}
                      </p>
                    )}
                    {r.assignment.section && (
                      <p>
                        🏫 <span className="font-medium">Section:</span>{" "}
                        {r.assignment.section.name}
                      </p>
                    )}
                    {r.assignment.dueDate && (
                      <p>
                        ⏰ <span className="font-medium">Due:</span>{" "}
                        {fmt(r.assignment.dueDate)}
                      </p>
                    )}
                    {r.assignment.totalMarks && (
                      <p>
                        💯 <span className="font-medium ">Marks:</span>{" "}
                        {r.assignment.totalMarks}
                      </p>
                    )}
                    {r.assignment.status && (
                      <span
                        className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.assignment.status === "published"
                            ? "bg-green-100 text-green-700"
                            : r.assignment.status === "draft"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.assignment.status}
                      </span>
                    )}
                  </div>
                )}

                {/* Event details */}
                {r.type === "event" && r.event && (
                  <div className="text-xs text-gray-600 space-y-0.5 mt-2">
                    {r.event.startTime && (
                      <p>
                        🕐 <span className="font-medium">Start:</span>{" "}
                        {fmt(r.event.startTime)}
                      </p>
                    )}
                    {r.event.endTime && (
                      <p>
                        🕔 <span className="font-medium">End:</span>{" "}
                        {fmt(r.event.endTime)}
                      </p>
                    )}
                  </div>
                )}

                {/* Color dot indicator */}
                {/* {r.event?.color && (
                  <span
                    className="inline-block w-3 h-3 rounded-full mt-1"
                    style={{ backgroundColor: r.event.color }}
                  />
                )} */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
