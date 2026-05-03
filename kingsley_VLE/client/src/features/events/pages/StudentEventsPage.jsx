import { useState, useEffect, useCallback } from "react";
import { eventsApi } from "../api/events.api";
import { enrollmentsApi } from "../../enrollments/api/enrollments.api";
import { useAuth } from "../../../context/AuthContext";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1d3e";

// Format datetime keeping UTC date but showing local time
// This prevents timezone shifts from changing which date the event is on
const fmt = (d) => {
  if (!d) return "—";

  // Convert to string if it's a Date object
  const dateStr = d instanceof Date ? d.toISOString() : String(d);

  // Extract UTC date from ISO string (YYYY-MM-DD part before T)
  const utcDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!utcDateMatch) return "—";

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

const typeBadge = {
  institution: "bg-purple-100 text-purple-700",
  course: "bg-blue-100 text-blue-700",
  section: "bg-green-100 text-green-700",
};

const typeLabel = {
  institution: "Institution-wide",
  course: "Course",
  section: "Section",
};

export default function StudentEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const load = useCallback(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      eventsApi.list(filterType ? { type: filterType } : {}),
      enrollmentsApi.listByUser(user.id),
    ])
      .then(([eventsRes, enrollmentsRes]) => {
        const eventData = eventsRes.data.data || eventsRes.data;
        const enrollmentData = Array.isArray(enrollmentsRes.data)
          ? enrollmentsRes.data
          : enrollmentsRes.data?.data || [];

        // Build sets of enrolled course and section IDs
        const enrolledCourseIds = new Set();

        enrollmentData.forEach((enrollment) => {
          if (enrollment.courseId) {
            enrolledCourseIds.add(enrollment.courseId);
          }
        });

        // Filter events based on conditions:
        // 1. Show all "institution" type events
        // 2. Show "course" type events only for courses student is enrolled in
        const filteredEvents = Array.isArray(eventData)
          ? eventData.filter((event) => {
              if (event.type === "institution") return true;
              if (
                event.type === "course" &&
                event.courseId &&
                enrolledCourseIds.has(event.courseId)
              )
                return true;
              return false;
            })
          : [];

        setEvents(filteredEvents);
        setEnrolledCourses(Array.from(enrolledCourseIds));
      })
      .catch(() => {
        setEvents([]);
        setEnrolledCourses([]);
      })
      .finally(() => setLoading(false));
  }, [filterType, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = events.filter((e) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q)
    );
  });

  const stats = [
    {
      label: "Total Events",
      value: events.length,
      icon: "/icon-events.png",
      bg: "bg-orange-50",
    },
    {
      label: "Institution",
      value: events.filter((e) => e.type === "institution").length,
      icon: "/institution-icon.png",
      bg: "bg-orange-50",
    },
    {
      label: "Course",
      value: events.filter((e) => e.type === "course").length,
      icon: "/allcourses-icon.png",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 lg:py-6">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-gray-900">
            Events
          </h1>
          <p className="text-sm text-gray-500 mt-1">Events › View</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 lg:px-8 lg:py-6 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-3.5 lg:gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left
 shadow-sm border border-gray-200"
          >
            <div
              className={`${s.bg} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}
            >
              <img
                src={s.icon}
                alt={s.label}
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-8 pb-4 lg:pb-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, description, location…"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
          />
        </div>
        <div className="w-full sm:w-64">
          <CustomDropdown
            options={[
              { id: "", name: "All Types" },
              { id: "institution", name: "Institution-wide" },
              { id: "course", name: "Course" },
            ]}
            value={filterType}
            onChange={(val) => setFilterType(val)}
            placeholder="All Types"
            isSmallScreen={false}
            BRAND={BRAND}
          />
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-8 pb-4 md:pb-4 lg:pb-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              Loading events…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              No events found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left whitespace-nowrap font-semibold text-gray-700">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Location
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium whitespace-nowrap text-gray-900">
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {event.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 whitespace-nowrap rounded-full text-xs font-medium ${typeBadge[event.type]}`}
                        >
                          {typeLabel[event.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {fmt(event.startTime)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {event.location || "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="text-blue-600 whitespace-nowrap hover:text-blue-800 font-medium text-xs"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Type
                </p>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeBadge[selectedEvent.type]} inline-block mt-1`}
                >
                  {typeLabel[selectedEvent.type]}
                </span>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.location && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Location
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {selectedEvent.location}
                  </p>
                </div>
              )}

              {selectedEvent.startTime && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Start Time
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {fmt(selectedEvent.startTime)}
                  </p>
                </div>
              )}

              {selectedEvent.endTime && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    End Time
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {fmt(selectedEvent.endTime)}
                  </p>
                </div>
              )}

              {selectedEvent.course && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Course
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {selectedEvent.course.title}
                  </p>
                </div>
              )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="w-full mt-6 px-4 py-2 bg-[#6b1142] text-white rounded-lg text-sm font-medium hover:bg-[#5a0d38]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
