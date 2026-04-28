import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../Sidebar/Sidebar";
import CalendarModal from "../../features/calendar/components/CalendarModal";

const portalTitle = {
  admin: "Admin Portal",
  student: "Student Portal",
  teacher: "Teacher Portal",
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const title = portalTitle[user?.role] || "VLE Portal";
  const isStudentCourseProfilePage = /^\/student\/courses\/[^/]+$/.test(
    location.pathname,
  );
  const isTeacherCourseProfilePage = /^\/teacher\/courses\/[^/]+$/.test(
    location.pathname,
  );

  useEffect(() => {
    const handleOpenCalendar = () => setCalendarOpen(true);
    window.addEventListener("open-calendar-modal", handleOpenCalendar);
    return () =>
      window.removeEventListener("open-calendar-modal", handleOpenCalendar);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Mobile Header - Only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-700"
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        {/* Mobile Calendar Button */}
        {!isTeacherCourseProfilePage && (
          <button
            onClick={() => setCalendarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-700"
            aria-label="Open calendar"
            title="Academic Calendar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 2v4M8 2v4M3 10h18"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Overlay - Only visible on small screens when sidebar is open */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Container */}
      <div className="flex flex-1 mt-16 md:mt-0">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="md:ml-[230px] flex-1 min-h-screen overflow-y-auto">
          {/* Desktop top bar with calendar button */}
          {!isTeacherCourseProfilePage && !isStudentCourseProfilePage && (
            <div className="hidden md:flex items-center justify-end px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
              <button
                onClick={() => setCalendarOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition text-sm font-medium"
                title="Open Academic Calendar"
              >
                <svg
                  className="w-4 h-4 text-[#6b1142]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 2v4M8 2v4M3 10h18"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Calendar</span>
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}
