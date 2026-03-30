import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, ExternalLink, Video } from "lucide-react";
import ClassRecordModal from "../components/ClassRecordModal";
import { classRecordsApi } from "../api/classRecords.api";
import { useAuth } from "../../../context/AuthContext";

const BRAND = "#6b1d3e";

const ClassRecords = () => {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const canEdit = user?.role === "admin" || user?.role === "teacher";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [cRes, sRes, smRes] = await Promise.all([
          classRecordsApi.getCourses(),
          classRecordsApi.getSections(),
          classRecordsApi.getSemesters(),
        ]);
        setCourses(cRes.data.courses || []);
        setSections(sRes.data || sRes || []);
        setSemesters(smRes.data || smRes || []);
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (selectedCourse) params.courseId = selectedCourse;
        if (selectedSection) params.sectionId = selectedSection;
        if (selectedSemester) params.semesterId = selectedSemester;
        const res = await classRecordsApi.list(params);
        const data = res.data?.records || res.data || [];
        // Client-side search filter
        setRecords(
          searchTerm
            ? data.filter((r) => r.title?.toLowerCase().includes(searchTerm.toLowerCase()))
            : data
        );
      } catch (err) {
        console.error("Error fetching class records:", err);
        setError("Failed to load class records. Please try again.");
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [selectedCourse, selectedSection, selectedSemester, searchTerm]);

  const handleCreate = async (payload) => {
    const res = await classRecordsApi.create(payload);
    setRecords((prev) => [res.data, ...prev]);
  };

  const handleUpdate = async (payload) => {
    const res = await classRecordsApi.update(editingRecord.id, payload);
    setRecords((prev) => prev.map((r) => (r.id === editingRecord.id ? res.data : r)));
    setEditingRecord(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class record?")) return;
    try {
      await classRecordsApi.delete(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error deleting record:", err);
      alert("Failed to delete. Please try again.");
    }
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Class Recordings
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {isStudent
              ? "View recorded class sessions for your courses."
              : "Manage class recording links and videos."}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-white"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Add Recording</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div
        className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
        style={{ background: "linear-gradient(to right, #6b1d3e, #5a1630)" }}
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by recording title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 placeholder-gray-400"
              style={{ "--tw-ring-color": BRAND }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
              style={{ "--tw-ring-color": BRAND }}
            >
              <option value="">All Courses</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
              style={{ "--tw-ring-color": BRAND }}
            >
              <option value="">All Sections</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
              style={{ "--tw-ring-color": BRAND }}
            >
              <option value="">All Semesters</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: BRAND }} />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="text-center py-16">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-base font-medium">No class recordings found</p>
          <p className="text-gray-400 text-sm mt-1">
            {canEdit ? "Add your first recording using the button above." : "No recordings are available yet."}
          </p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col">
              {/* Card header */}
              <div className="p-4 sm:p-5 flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fdf2f8" }}>
                    <Video className="w-5 h-5" style={{ color: BRAND }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{record.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{record.course?.title || "No course"}</p>
                  </div>
                </div>

                {record.description && (
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3">{record.description}</p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {record.section && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {record.section.name}
                    </span>
                  )}
                  {record.semester && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                      {record.semester.name}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  {new Date(record.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>

              {/* Card footer */}
              <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <a
                  href={record.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-medium transition hover:underline"
                  style={{ color: BRAND }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Recording
                </a>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(record)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {canEdit && (
        <ClassRecordModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={editingRecord ? handleUpdate : handleCreate}
          record={editingRecord}
        />
      )}
    </div>
  );
};

export default ClassRecords;
