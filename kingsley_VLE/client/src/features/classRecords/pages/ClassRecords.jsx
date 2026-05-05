import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Video,
  Grid3x3,
  List,
} from "lucide-react";
import ClassRecordModal from "../components/ClassRecordModal";
import CustomDropdown from "../components/CustomDropdown";
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
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);
  // Relationship maps: semester -> courses, course -> sections
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Handle screen resize for responsive styling
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch all courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await classRecordsApi.getCourses();
        const coursesList = res.data?.data || res.data?.courses || [];
        // console.log("Courses fetched:", coursesList);
        setCourses(coursesList);
        setFilteredCourses(coursesList);
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };
    fetchCourses();
  }, []);

  // Fetch all sections and semesters on mount + build relationship map
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoadingDropdowns(true);
        const [cRes, sRes, smRes] = await Promise.all([
          classRecordsApi.getCourses(),
          classRecordsApi.getSections(),
          classRecordsApi.getSemesters(),
        ]);

        const coursesList = cRes.data?.data || cRes.data?.courses || [];
        const sectionsData = Array.isArray(sRes.data) ? sRes.data : sRes || [];
        const semestersData = Array.isArray(smRes.data)
          ? smRes.data
          : smRes || [];

        // console.log("Courses data:", coursesList);
        // console.log("Sections data:", sectionsData);
        // console.log("Semesters data:", semestersData);

        setCourses(coursesList);
        setSections(sectionsData);
        setSemesters(semestersData);
        setFilteredCourses(coursesList);
        setFilteredSections(sectionsData);
        setFilteredSemesters(semestersData);

        // Build semester -> courses map (from courses table)
        const semCxMap = {};
        coursesList.forEach((course) => {
          const semId = course.semesterId;
          if (semId) {
            if (!semCxMap[semId]) semCxMap[semId] = [];
            if (!semCxMap[semId].includes(course.id)) {
              semCxMap[semId].push(course.id);
            }
          }
        });

        // Build course -> sections map (from sections table)
        const cxSecMap = {};
        sectionsData.forEach((section) => {
          const courseId = section.courseId;
          if (courseId) {
            if (!cxSecMap[courseId]) cxSecMap[courseId] = [];
            if (!cxSecMap[courseId].includes(section.id)) {
              cxSecMap[courseId].push(section.id);
            }
          }
        });

        // console.log("Semester course map:", semCxMap);
        // console.log("Course section map:", cxSecMap);

        setSemesterCourseMap(semCxMap);
        setCourseSectionMap(cxSecMap);

        // Auto-select the latest semester (first one in the list)
        if (semestersData.length > 0) {
          setSelectedSemester(semestersData[0].id);
        }

        // Mark initial load as complete so records can be fetched
        setIsInitialLoadComplete(true);
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
        setIsInitialLoadComplete(true);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Filter courses based on selected semester
  useEffect(() => {
    if (selectedSemester) {
      // Semester is selected
      if (semesterCourseMap[selectedSemester]) {
        // Semester exists in map - show its courses
        const courseIds = semesterCourseMap[selectedSemester];
        // console.log(
        //   "Filtering courses for semester:",
        //   selectedSemester,
        //   courseIds,
        // );
        setFilteredCourses(courses.filter((c) => courseIds.includes(c.id)));
      } else {
        // Semester selected but has no courses - show empty
        // console.log("Semester selected but has no courses");
        setFilteredCourses([]);
      }
    } else {
      // No semester selected - show all courses
      // console.log("No semester selected - showing all courses");
      setFilteredCourses(courses);
    }
    // Reset course and section when semester changes
    setSelectedCourse("");
    setSelectedSection("");
  }, [selectedSemester, semesterCourseMap, courses]);

  // Filter sections based on selected course
  useEffect(() => {
    if (selectedCourse) {
      // Course is selected
      if (courseSectionMap[selectedCourse]) {
        // Course exists in map - show its sections
        const sectionIds = courseSectionMap[selectedCourse];
        // console.log(
        //   "Filtering sections for course:",
        //   selectedCourse,
        //   sectionIds,
        // );
        setFilteredSections(sections.filter((s) => sectionIds.includes(s.id)));
      } else {
        // Course selected but has no sections - show empty
        // console.log("Course selected but has no sections");
        setFilteredSections([]);
      }
    } else {
      // No course selected - show all sections
      // console.log("No course selected - showing all sections");
      setFilteredSections(sections);
    }
    // Reset section when course changes
    setSelectedSection("");
  }, [selectedCourse, courseSectionMap, sections]);

  // Ensure all semesters are always available (semester is the parent/first selector)
  useEffect(() => {
    setFilteredSemesters(semesters);
  }, [semesters]);

  useEffect(() => {
    // Prevent fetch before initial load is complete (semester auto-selection)
    if (!isInitialLoadComplete) return;

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
            ? data.filter((r) =>
                r.title?.toLowerCase().includes(searchTerm.toLowerCase()),
              )
            : data,
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
  }, [
    isInitialLoadComplete,
    selectedCourse,
    selectedSection,
    selectedSemester,
    searchTerm,
  ]);

  const handleCreate = async (payload) => {
    try {
      const res = await classRecordsApi.create(payload);
      setRecords((prev) => [res.data, ...prev]);
      await Swal.fire({
        title: "Success!",
        text: "Class record created successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error creating record:", err);
      await Swal.fire({
        title: "Error",
        text:
          err?.response?.data?.error ||
          "Failed to create record. Please try again.",
        icon: "error",
      });
    }
  };

  const handleUpdate = async (payload) => {
    try {
      const res = await classRecordsApi.update(editingRecord.id, payload);
      setRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? res.data : r)),
      );
      setEditingRecord(null);
      await Swal.fire({
        title: "Success!",
        text: "Class record updated successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error updating record:", err);
      await Swal.fire({
        title: "Error",
        text:
          err?.response?.data?.error ||
          "Failed to update record. Please try again.",
        icon: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Class Record?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await classRecordsApi.delete(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      await Swal.fire({
        title: "Deleted!",
        text: "Class record has been deleted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error deleting record:", err);
      await Swal.fire({
        title: "Error",
        text:
          err?.response?.data?.error || "Failed to delete. Please try again.",
        icon: "error",
      });
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
    <div className="min-h-screen bg-gray-50 px-4 py-4 md:px-6 md:py-6 lg:px-8  lg:py-8">
      {/* Header */}
      <div className="mb-4 md:mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
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
        <div className="flex justify-between md:items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 md:p-1 border border-gray-200 shadow-sm h-fit">
            <button
              onClick={() => setViewMode("grid")}
              className="p-1.5 rounded transition"
              style={{
                backgroundColor: viewMode === "grid" ? BRAND : "#f3f4f6",
                color: viewMode === "grid" ? "white" : "#6b7280",
              }}
              title="Grid View"
            >
              <Grid3x3 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="p-1.5 rounded transition"
              style={{
                backgroundColor: viewMode === "list" ? BRAND : "#f3f4f6",
                color: viewMode === "list" ? "white" : "#6b7280",
              }}
              title="List View"
            >
              <List className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          {canEdit && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-white"
              style={{ backgroundColor: BRAND }}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className=" sm:inline">Add Recording</span>
              {/* <span className="sm:hidden">Add</span> */}
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-lg lg:p-6 mb-6 sm:mb-8"
        style={{
          background: isSmallScreen
            ? "transparent"
            : "linear-gradient(to right, #6b1d3e, #5a1630)",
          padding: isSmallScreen ? "0" : undefined,
        }}
      >
        <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-3">
          {/* Search */}
          <div className="flex flex-col">
            <label
              className="text-xs sm:text-sm font-semibold mb-1.5 flex items-center gap-1.5"
              style={{
                color: isSmallScreen ? "#374151" : "white",
              }}
            >
              <Search className="w-4 h-4" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:ring-2"
              style={{
                "--tw-ring-color": BRAND,
                backgroundColor: isSmallScreen ? "#5f1834" : "white",
                color: isSmallScreen ? "white" : "#374151",
                padding: isSmallScreen ? "10px 8px" : "10px 16px",
              }}
            />
          </div>

          {/* Semester Dropdown (First) */}
          <div className="flex flex-col">
            <CustomDropdown
              options={[
                {
                  id: "",
                  name: loadingDropdowns
                    ? "Loading..."
                    : `All Semesters (${filteredSemesters.length})`,
                },
                ...filteredSemesters.map((semester) => ({
                  id: semester.id,
                  name: `${semester.name || "Untitled Semester"} ${semester.year ? `(${semester.year})` : ""}`,
                })),
              ]}
              value={selectedSemester}
              onChange={setSelectedSemester}
              placeholder={loadingDropdowns ? "Loading..." : "All Semesters"}
              label="Semester"
              countText={
                loadingDropdowns ? "" : `(${filteredSemesters.length})`
              }
              isSmallScreen={isSmallScreen}
              BRAND={BRAND}
              disabled={loadingDropdowns}
            />
          </div>

          {/* Course Dropdown (Second - depends on semester) */}
          <div className="flex flex-col">
            <CustomDropdown
              options={filteredCourses.map((course) => ({
                id: course.id,
                name: course.title || course.name || "Untitled Course",
              }))}
              value={selectedCourse}
              onChange={setSelectedCourse}
              placeholder="All Courses"
              label="Course"
              countText={`(${filteredCourses.length})`}
              isSmallScreen={isSmallScreen}
              BRAND={BRAND}
              disabled={!selectedSemester}
            />
          </div>

          {/* Section Dropdown (Third - depends on course) */}
          <div className="flex flex-col">
            <CustomDropdown
              options={filteredSections.map((section) => ({
                id: section.id,
                name: section.name || "Untitled Section",
              }))}
              value={selectedSection}
              onChange={setSelectedSection}
              placeholder="All Sections"
              label="Section"
              countText={`(${filteredSections.length})`}
              isSmallScreen={isSmallScreen}
              BRAND={BRAND}
              disabled={!selectedCourse}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {(loading || !isInitialLoadComplete) && (
        <div className="flex items-center justify-center py-16">
          <div
            className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin"
            style={{ borderTopColor: BRAND }}
          />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && records.length === 0 && isInitialLoadComplete && (
        <div className="text-center py-16">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-base font-medium">
            No class recordings found
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {canEdit
              ? "Add your first recording using the button above."
              : "No recordings are available yet."}
          </p>
        </div>
      )}

      {!loading && !error && records.length > 0 && isInitialLoadComplete && (
        <>
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col"
                >
                  {/* Card header */}
                  <div className="p-4 sm:p-5 flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "#fdf2f8" }}
                      >
                        <Video className="w-5 h-5" style={{ color: BRAND }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {record.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {record.course?.title || "No course"}
                        </p>
                      </div>
                    </div>

                    {record.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3">
                        {record.description}
                      </p>
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
                      {new Date(record.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Card footer */}
                  <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <a
                      href={record.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-medium transition hover:underline"
                      style={{ color: "#5c1732" }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Recording
                    </a>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(record)}
                          className="p-1.5 rounded transition hover:bg-[#f3e8f0]"
                          style={{
                            color: "#5c1732",
                          }}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 rounded transition hover:bg-[#f3e8f0]"
                          style={{
                            color: "#5c1732",
                          }}
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

          {/* List View */}
          {viewMode === "list" && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className="text-white"
                      style={{ backgroundColor: BRAND }}
                    >
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Title
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Course
                      </th>
                      <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Semester
                      </th>
                      <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Section
                      </th>
                      <th className="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        Date
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition"
                      >
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2 max-w-xs">
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center"
                              style={{ backgroundColor: "#fdf2f8" }}
                            >
                              <Video
                                className="w-4 h-4"
                                style={{ color: BRAND }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {record.title}
                              </p>
                              {record.description && (
                                <p className="text-xs text-gray-500 truncate">
                                  {record.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <p className="text-xs sm:text-sm text-gray-900">
                            {record.course?.title || "-"}
                          </p>
                        </td>
                        <td className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-wrap gap-1">
                            {record.semester ? (
                              <span className="inline-flex whitespace-nowrap items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                {record.semester.name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-wrap gap-1">
                            {record.section ? (
                              <span className="inline-flex whitespace-nowrap items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {record.section.name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4">
                          <p className="text-xs sm:text-sm whitespace-nowrap text-gray-500">
                            {new Date(record.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={record.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded transition hover:bg-[#f3e8f0]"
                              style={{
                                color: "#5c1732",
                                
                              }}
                              title="Open Recording"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => openEdit(record)}
                                  className="p-1.5 rounded transition hover:bg-[#f3e8f0]"
                                  style={{
                                    color: "#5c1732",
                                  }}
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(record.id)}
                                  className="p-1.5 rounded transition hover:bg-[#f3e8f0]"
                                  style={{
                                    color: "#5c1732",
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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
