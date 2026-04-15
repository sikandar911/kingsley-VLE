import { useState, useEffect, useCallback, useRef } from "react";
import { calendarApi } from "../api/calendar.api";
import CanvasCalendar from "./CanvasCalendar";
import ReminderPopup from "./ReminderPopup";

export default function CalendarModal({ isOpen, onClose }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(false);

  // Reminder popup state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReminders, setSelectedReminders] = useState([]);

  const overlayRef = useRef(null);

  // Fetch a full month range when month/year changes
  const fetchMonth = useCallback((y, m) => {
    const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    setLoading(true);
    calendarApi
      .getRange(from, to)
      .then((res) => setGrouped(res.data.grouped || {}))
      .catch(() => setGrouped({}))
      .finally(() => setLoading(false));
  }, []);

  // Fetch when month/year changes
  useEffect(() => {
    if (isOpen) fetchMonth(year, month);
  }, [isOpen, year, month, fetchMonth]);

  // Listen for month navigation events from CanvasCalendar
  const handleMonthChange = (newYear, newMonth) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleDayClick = (dateStr) => {
    const reminders = grouped[dateStr] || [];
    if (!reminders.length) return;
    setSelectedDate(dateStr);
    setSelectedReminders(reminders);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Calendar overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[100] flex items-start justify-end pt-16 pr-4 sm:pr-6 md:pr-8"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      >
        {/* Calendar panel */}
        <div
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden animate-fadeIn"
          style={{ height: 420 }}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#6b1142] to-[#9a1a5e]">
            <div className="flex items-center gap-2">
              <span className="text-white text-lg">📅</span>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Academic Calendar
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 text-xl leading-none transition"
              >
                ×
              </button>
            </div>
          </div>

          {/* Calendar body */}
          <div className="flex-1 p-3 overflow-hidden">
            <CanvasCalendar
              grouped={grouped}
              onDayClick={handleDayClick}
              onMonthChange={handleMonthChange}
            />
          </div>
        </div>
      </div>

      {/* Reminder detail popup (layered above calendar) */}
      {selectedDate && (
        <ReminderPopup
          reminders={selectedReminders}
          dateStr={selectedDate}
          onClose={() => {
            setSelectedDate(null);
            setSelectedReminders([]);
          }}
        />
      )}
    </>
  );
}
