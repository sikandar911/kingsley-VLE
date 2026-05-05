import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { assignmentsApi } from "../api/assignments.api";
import { coursesApi } from "../../courses/api/courses.api";
import { courseModulesApi } from "../../courseModules/api/courseModules.api";
import api from "../../../lib/api";
import CreateAssignmentModal from "../components/CreateAssignmentModal";
import AssignmentPreviewModal from "../components/AssignmentPreviewModal";
import ViewSubmissionsModal from "../components/ViewSubmissionsModal";
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

const statusBadge = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
};

export default function AdminAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Filter states
  const [filterSemester, setFilterSemester] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterModule, setFilterModule] = useState("");

  // Metadata states
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [courseModules, setCourseModules] = useState([]);

  // Filtered lists for dropdowns
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);

  // Maps for dependent filtering
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});

  // Loading states
  const [metaLoading, setMetaLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editAssignment, setEditAssignment] = useState(null);
  const [preview, setPreview] = useState(null);
  const [viewSubmissions, setViewSubmissions] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const filterParams = {};
    if (filterStatus) filterParams.status = filterStatus;
    if (filterSemester) filterParams.semesterId = filterSemester;
    if (filterCourse) filterParams.courseId = filterCourse;
    if (filterSection) filterParams.sectionId = filterSection;
    if (filterModule) filterParams.courseModuleId = filterModule;

    assignmentsApi
      .list(filterParams)
      .then((res) => setAssignments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus, filterSemester, filterCourse, filterSection, filterModule]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch metadata on mount - show ALL semesters, courses, sections (no teacher filtering)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const promises = [
          coursesApi.list({ limit: 200 }),
          api.get("/semesters"),
        ];

        const responses = await Promise.all(promises);

        const coursesRes = responses[0];
        const fullCourseList = coursesRes.data?.data || [];

        const semestersRes = responses[1];
        const semestersList = Array.isArray(semestersRes.data)
          ? semestersRes.data
          : semestersRes.data?.data || [];

        // Build semester -> courses map
        const semCxMap = {};
        fullCourseList.forEach((course) => {
          const semId = course.semesterId;
          if (semId) {
            if (!semCxMap[semId]) semCxMap[semId] = [];
            if (!semCxMap[semId].includes(course.id)) {
              semCxMap[semId].push(course.id);
            }
          }
        });

        // Build course -> sections map
        const cxSecMap = {};
        fullCourseList.forEach((course) => {
          if (course.sections && Array.isArray(course.sections)) {
            cxSecMap[course.id] = course.sections.map((s) => s.id);
          }
        });

        setCourses(fullCourseList);
        setSemesters(semestersList);
        setFilteredCourses(fullCourseList);
        setFilteredSemesters(semestersList);

        setSemesterCourseMap(semCxMap);
        setCourseSectionMap(cxSecMap);
      } catch (err) {
        console.error("Error fetching metadata:", err);
      } finally {
        setMetaLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  // Filter courses based on selected semester
  useEffect(() => {
    if (filterSemester && semesterCourseMap[filterSemester]) {
      const courseIds = semesterCourseMap[filterSemester];
      const filtered = courses.filter((c) => courseIds.includes(c.id));
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
    // Reset course, section, module when semester changes
    setFilterCourse("");
    setFilterSection("");
    setFilterModule("");
    setFilteredSections([]);
    setFilteredModules([]);
  }, [filterSemester, semesterCourseMap, courses]);

  // Filter sections and fetch modules based on selected course
  useEffect(() => {
    if (filterCourse && courseSectionMap[filterCourse]) {
      const sectionIds = courseSectionMap[filterCourse];
      const courseObj = courses.find((c) => c.id === filterCourse);
      const sectionsList = courseObj?.sections || [];
      setFilteredSections(
        sectionsList.filter((s) => sectionIds.includes(s.id)),
      );
      // Fetch modules for the selected course
      courseModulesApi
        .list({
          courseId: filterCourse,
          ...(filterSection ? { sectionId: filterSection } : {}),
        })
        .then((res) => setFilteredModules(res.data?.modules || []))
        .catch(() => setFilteredModules([]));
    } else {
      setFilteredSections([]);
      setFilteredModules([]);
    }
    // Reset section and module when course changes
    setFilterSection("");
    setFilterModule("");
  }, [filterCourse, courseSectionMap, courses]);

  // Re-fetch modules when section changes
  useEffect(() => {
    if (filterCourse) {
      courseModulesApi
        .list({
          courseId: filterCourse,
          ...(filterSection ? { sectionId: filterSection } : {}),
        })
        .then((res) => setFilteredModules(res.data?.modules || []))
        .catch(() => setFilteredModules([]));
    }
    // Reset module when section changes
    setFilterModule("");
  }, [filterSection, filterCourse]);

  const filtered = assignments.filter((a) => {
    // Apply search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        a.title.toLowerCase().includes(q) ||
        a.course?.title.toLowerCase().includes(q) ||
        a.teacher?.fullName?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Apply status filter
    if (filterStatus && a.status !== filterStatus) return false;

    // Apply semester filter
    if (filterSemester && a.semesterId !== filterSemester) return false;

    // Apply course filter
    if (filterCourse && a.courseId !== filterCourse) return false;

    // Apply section filter
    if (filterSection && a.sectionId !== filterSection) return false;

    // Apply module filter
    if (filterModule && a.courseModuleId !== filterModule) return false;

    return true;
  });

  const totalSubmissions = assignments.reduce(
    (s, a) => s + (a._count?.submissions || 0),
    0,
  );
  const published = assignments.filter((a) => a.status === "published").length;
  const draft = assignments.filter((a) => a.status === "draft").length;

  const stats = [
    {
      label: "Total Assignments",
      value: assignments.length,
      icon: "/assignment-icon.png",
      bg: "bg-orange-50",
    },
    {
      label: "Submissions",
      value: totalSubmissions,
      icon: "/submission-icon.png",
      bg: "bg-orange-50",
    },
    {
      label: "Published",
      value: published,
      icon: "/published-icon.png",
      bg: "bg-orange-50",
    },
    {
      label: "Drafts",
      value: draft,
      icon: "/draft-icon.png",
      bg: "bg-orange-50",
    },
  ];

  const handleEdit = (assignment) => {
    setPreview(null);
    setEditAssignment(assignment);
    setShowCreate(true);
  };

  const handleStatusChange = async (assignment, newStatus) => {
    setUpdatingId(assignment.id);
    try {
      await assignmentsApi.updateStatus(assignment.id, newStatus);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (assignment) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${assignment.title}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(assignment.id);
    try {
      await assignmentsApi.delete(assignment.id);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to delete assignment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] ">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 lg:py-6">
        <div className="lg:flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-gray-900">
              Assignment Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Assignments › List</p>
          </div>
          <button
            onClick={() => {
              setEditAssignment(null);
              setShowCreate(true);
            }}
            className="mt-2 lg:mt-0 px-3.5 md:px-6 py-2.5 bg-[#6b1142] text-[12.5px] md:text-[15px] lg:text-[15px] text-white rounded-lg font-medium hover:bg-[#5a0d38] transition"
          >
            + Create New Assignment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 lg:px-8 lg:py-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-3.5 lg:gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-5 flex flex-col md:flex-row items-center gap-4 shadow-sm border border-gray-200"
          >
            <div
              className={`${s.bg} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}
            >
              <img
                src={s.icon}
                alt={s.label}
                className="w-8 h-8 sm:w-9 sm:h-9"
              />
            </div>
            <div className=" flex-col text-center md:text-left md:flex-row">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-8 pb-4 lg:pb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, course, instructor…"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>
          <div className="w-full sm:w-64">
            <CustomDropdown
              options={[
                { id: "", name: "All Status" },
                { id: "draft", name: "Draft" },
                { id: "published", name: "Published" },
                { id: "closed", name: "Closed" },
              ]}
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              placeholder="All Status"
              isSmallScreen={false}
              BRAND={BRAND}
            />
          </div>
        </div>

        {/* Dependent Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Semester Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Semester
            </label>
            <CustomDropdown
              options={[
                { id: "", name: "All Semesters" },
                ...filteredSemesters.map((s) => ({
                  id: s.id,
                  name: `${s.name} (${s.year})`,
                })),
              ]}
              value={filterSemester}
              onChange={(val) => setFilterSemester(val)}
              placeholder="Select Semester"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={metaLoading}
            />
          </div>

          {/* Course Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Course
            </label>
            <CustomDropdown
              options={[
                { id: "", name: "All Courses" },
                ...filteredCourses.map((c) => ({ id: c.id, name: c.title })),
              ]}
              value={filterCourse}
              onChange={(val) => setFilterCourse(val)}
              placeholder="Select Course"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={!filterSemester || filteredCourses.length === 0}
            />
          </div>

          {/* Section Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Section
            </label>
            <CustomDropdown
              options={[
                { id: "", name: "All Sections" },
                ...filteredSections.map((s) => ({ id: s.id, name: s.name })),
              ]}
              value={filterSection}
              onChange={(val) => setFilterSection(val)}
              placeholder="Select Section"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={!filterCourse || filteredSections.length === 0}
            />
          </div>

          {/* Module Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Module
            </label>
            <CustomDropdown
              options={[
                { id: "", name: "All Modules" },
                ...filteredModules.map((m) => ({ id: m.id, name: m.name })),
              ]}
              value={filterModule}
              onChange={(val) => setFilterModule(val)}
              placeholder="Select Module"
              isSmallScreen={false}
              BRAND={BRAND}
              disabled={!filterCourse || filteredModules.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-8 pb-4 md:pb-4  lg:pb-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-[#6b1142] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-5xl mb-3">📋</span>
              <p className="text-sm">
                {assignments.length === 0
                  ? "No assignments yet"
                  : "No matching assignments"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Assignment",
                      "Course / Section",
                      "Deadline",
                      "Submissions",
                      "Status",
                      "Instructor",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a) => {
                    const subCount = a._count?.submissions || 0;
                    const isOverdue = Boolean(
                      a.dueDate && new Date() > new Date(a.dueDate),
                    );
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            {a.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">
                            {a.targetType === "section"
                              ? "Section assignment"
                              : "Individual"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-gray-800">
                            {a.course?.title || "—"}
                          </p>
                          {a.section && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {a.section.name}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-400 whitespace-nowrap">
                            Created: {fmt(a.createdAt)}
                          </p>
                          {a.dueDate && (
                            <p
                              className={`text-xs mt-0.5 whitespace-nowrap font-medium ${isOverdue ? "text-red-600" : "text-gray-700"}`}
                            >
                              Due: {fmt(a.dueDate)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {subCount}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[a.status] || "bg-gray-100 text-gray-500"}`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {a.teacher?.fullName || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {/* Preview */}
                            <button
                              onClick={() => setPreview(a)}
                              className="p-1.5 hover:bg-gray-100 rounded transition"
                              title="Preview"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="#6b1d3e"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleEdit(a)}
                              className="p-1.5 hover:bg-gray-100 rounded transition"
                              title="Edit"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="#6b1d3e"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                />
                              </svg>
                            </button>

                            {/* View Submissions */}
                            <button
                              onClick={() => setViewSubmissions(a)}
                              className="p-1.5 hover:bg-blue-50 rounded transition"
                              title="View Submissions"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="#6b1d3e"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3"
                                />
                              </svg>
                            </button>

                            {/* Publish (only if draft) */}
                            {a.status === "draft" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(a, "published")
                                }
                                disabled={updatingId === a.id}
                                className={`p-1.5 rounded transition text-base ${
                                  updatingId === a.id
                                    ? "animate-spin"
                                    : "hover:bg-green-50"
                                }`}
                                title="Publish"
                              >
                                {updatingId === a.id ? "🟡" : "🟢"}
                              </button>
                            )}

                            {/* Close (only if published) */}
                            {a.status === "published" && (
                              <button
                                onClick={() => handleStatusChange(a, "closed")}
                                disabled={updatingId === a.id}
                                className={`p-1.5 rounded transition text-base ${
                                  updatingId === a.id
                                    ? "animate-spin"
                                    : "hover:bg-red-50"
                                }`}
                                title="Close Assignment"
                              >
                                {updatingId === a.id ? "🟡" : "🔴"}
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(a)}
                              disabled={deletingId === a.id}
                              className={`p-1.5 rounded transition ${
                                deletingId === a.id
                                  ? "animate-spin"
                                  : "hover:bg-red-100"
                              }`}
                              title="Delete Assignment"
                            >
                              {deletingId === a.id ? (
                                <svg
                                  className="w-5 h-5"
                                  fill="#fbbf24"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 6 15.5 6 14 6.67 14 7.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 6 8.5 6 7 6.67 7 7.5 7.67 9 8.5 9z" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="#6b1d3e"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateAssignmentModal
          editAssignment={editAssignment}
          onClose={() => {
            setShowCreate(false);
            setEditAssignment(null);
          }}
          onSaved={() => {
            setShowCreate(false);
            setEditAssignment(null);
            load();
          }}
        />
      )}

      {preview && (
        <AssignmentPreviewModal
          assignment={preview}
          role={user?.role}
          onClose={() => setPreview(null)}
          onEdit={() => handleEdit(preview)}
          onRefresh={load}
        />
      )}

      {viewSubmissions && (
        <ViewSubmissionsModal
          assignment={viewSubmissions}
          onClose={() => setViewSubmissions(null)}
        />
      )}
    </div>
  );
}
