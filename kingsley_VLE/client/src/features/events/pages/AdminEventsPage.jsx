import { useState, useEffect, useCallback } from "react";
import { eventsApi } from "../api/events.api";
import CreateEventModal from "../components/CreateEventModal";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

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

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    eventsApi
      .list(filterType ? { type: filterType } : {})
      .then((res) => {
        const data = res.data.data || res.data;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [filterType]);

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
      icon: "📅",
      bg: "bg-blue-50",
    },
    {
      label: "Institution",
      value: events.filter((e) => e.type === "institution").length,
      icon: "🏛️",
      bg: "bg-purple-50",
    },
    {
      label: "Course",
      value: events.filter((e) => e.type === "course").length,
      icon: "📚",
      bg: "bg-indigo-50",
    },
    {
      label: "Section",
      value: events.filter((e) => e.type === "section").length,
      icon: "🏫",
      bg: "bg-green-50",
    },
  ];

  const handleEdit = (event) => {
    setEditEvent(event);
    setShowCreate(true);
  };

  const handleDelete = async (eventId) => {
    try {
      await eventsApi.delete(eventId);
      load();
      setDeleteConfirm(null);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to delete event");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 lg:py-6">
        <div className="lg:flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-gray-900">
              Events Calendar
            </h1>
            <p className="text-sm text-gray-500 mt-1">Events › Management</p>
          </div>
          <button
            onClick={() => {
              setEditEvent(null);
              setShowCreate(true);
            }}
            className="mt-2 lg:mt-0 px-3.5 md:px-6 py-2.5 bg-[#6b1142] text-[12.5px] md:text-[15px] lg:text-[15px] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition"
          >
            + Create New Event
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 lg:px-8 lg:py-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3.5 lg:gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 md:p-5 flex items-center gap-3 md:gap-4 shadow-sm border border-gray-200"
          >
            <div
              className={`${s.bg} w-12 h-12 rounded-lg flex items-center justify-center text-xl md:text-2xl flex-shrink-0`}
            >
              {s.icon}
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
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Start Time
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      Location
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">
                      Actions
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
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {event.location || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleEdit(event)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(event)}
                          className="text-red-600 hover:text-red-800 font-medium text-xs"
                        >
                          Delete
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

      {/* Modals */}
      <CreateEventModal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditEvent(null);
        }}
        onSuccess={() => {
          setEditEvent(null);
          load();
        }}
        editEvent={editEvent}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Event
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure? This will also remove all associated calendar
              reminders.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
