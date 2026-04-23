import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Search, Plus, Eye, Trash2, FileText, Link, Edit2 } from "lucide-react";
import ClassMaterialsModal from "../components/ClassMaterialsModal";
import SecureFileLink, {
  getMaterialSource,
} from "../components/SecureFileLink";
import { classMaterialsApi } from "../api/classMaterials.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const ClassMaterials = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // All dropdown options from API (never change unless new data added)
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);

  // Filtered dropdown options based on current selection
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);

  // Relationship maps: semester -> courses, course -> sections
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);

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
        const response = await classMaterialsApi.getCourses();
        const coursesList = response.data?.data || response.data?.courses || [];
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
          classMaterialsApi.getCourses(),
          classMaterialsApi.getSections(),
          classMaterialsApi.getSemesters(),
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

        // Mark initial load as complete to trigger materials fetch
        setIsInitialLoadComplete(true);
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
        // Still mark as complete even on error to allow manual filtering
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

  // When filters change, update materials
  useEffect(() => {
    // Don't fetch materials until initial load (semester auto-selection) is complete
    if (!isInitialLoadComplete) return;

    const fetchMaterials = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (selectedCourse) params.courseId = selectedCourse;
        if (selectedSection) params.sectionId = selectedSection;
        if (selectedSemester) params.semesterId = selectedSemester;
        if (searchTerm) params.search = searchTerm;

        const response = await classMaterialsApi.list(params);
        const data =
          response.data?.materials || response.data || response || [];
        const materialsData = Array.isArray(data) ? data : [];
        setMaterials(materialsData);
      } catch (err) {
        console.error("Error fetching materials:", err);
        setError("Failed to load materials. Please try again.");
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [
    isInitialLoadComplete,
    selectedCourse,
    selectedSection,
    selectedSemester,
    searchTerm,
  ]);

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
  };

  const handleSectionChange = (sectionId) => {
    setSelectedSection(sectionId);
  };

  const handleSemesterChange = (semesterId) => {
    setSelectedSemester(semesterId);
  };

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Class Material?",
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
      await classMaterialsApi.delete(id);
      setMaterials(materials.filter((m) => m.id !== id));
      await Swal.fire({
        title: "Deleted!",
        text: "Class material has been deleted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Error deleting material:", err);
      await Swal.fire({
        title: "Error",
        text:
          err?.response?.data?.error ||
          "Failed to delete material. Please try again.",
        icon: "error",
      });
    }
  };

  const handleAddMaterial = async (formData) => {
    try {
      // If formData provided, create a new material
      if (formData) {
        await classMaterialsApi.create(formData);
      }
      // Refresh materials list
      await refreshMaterials();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error with material:", err);
      // Re-throw so modal can handle it
      throw err;
    }
  };

  const refreshMaterials = async () => {
    try {
      const params = {};
      if (selectedCourse) params.courseId = selectedCourse;
      if (selectedSection) params.sectionId = selectedSection;
      if (selectedSemester) params.semesterId = selectedSemester;
      if (searchTerm) params.search = searchTerm;

      const response = await classMaterialsApi.list(params);
      const data = response.data?.materials || response.data || response || [];
      const materialsData = Array.isArray(data) ? data : [];
      setMaterials(materialsData);
    } catch (err) {
      console.error("Error refreshing materials:", err);
    }
  };

  const getCourseName = (material) => {
    // Check nested object first (from API response)
    if (material.course?.title) return material.course.title;
    // Fallback to searching local state
    const course = courses.find((c) => c.id === material.courseId);
    return course ? course.title : material.courseId;
  };

  const getSectionName = (material) => {
    // Check nested object first (from API response)
    if (material.section?.name) return material.section.name;
    // Fallback to searching local state
    const section = sections.find((s) => s && s.id === material.sectionId);
    return section ? section.name : material.sectionId;
  };

  const getSemesterName = (material) => {
    // Check nested object first (from API response)
    if (material.semester?.name) {
      return material.semester.year
        ? `${material.semester.name} (${material.semester.year})`
        : material.semester.name;
    }
    // Fallback to searching local state
    const semester = semesters.find((s) => s && s.id === material.semesterId);
    return semester ? semester.name : material.semesterId;
  };

  // getMaterialUrl is replaced by getMaterialSource + SecureFileLink

  return (
    <>
      <div className="min-h-screen bg-gray-50 px-4 py-4 md:px-4 lg:px-8  lg:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8 lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Class Materials
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage class materials for different courses and sections.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingMaterial(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-white mt-2 md:mt-3 lg:mt-0"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className=" sm:inline">Add New Material</span>
          </button>
        </div>

        {/* Filters */}
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

            {/* Semester Dropdown */}
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
                    id: semester?.id,
                    name: `${semester?.name || "Untitled Semester"} ${semester?.year ? `(${semester.year})` : ""}`,
                  })),
                ]}
                value={selectedSemester}
                onChange={(val) => handleSemesterChange(val)}
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

            {/* Course Dropdown */}
            <div className="flex flex-col">
              <CustomDropdown
                options={[
                  { id: "", name: `All Courses (${filteredCourses.length})` },
                  ...filteredCourses.map((course) => ({
                    id: course.id,
                    name: course.title,
                  })),
                ]}
                value={selectedCourse}
                onChange={(val) => handleCourseChange(val)}
                placeholder="All Courses"
                label="Course"
                countText={`(${filteredCourses.length})`}
                isSmallScreen={isSmallScreen}
                BRAND={BRAND}
                disabled={!selectedSemester}
              />
            </div>

            {/* Section Dropdown */}
            <div className="flex flex-col">
              <CustomDropdown
                options={[
                  { id: "", name: `All Sections (${filteredSections.length})` },
                  ...filteredSections.map((section) => ({
                    id: section?.id,
                    name: section?.name,
                  })),
                ]}
                value={selectedSection}
                onChange={(val) => handleSectionChange(val)}
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

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-white" style={{ backgroundColor: BRAND }}>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">
                    TITLE
                  </th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">
                    COURSE
                  </th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">
                    SECTION
                  </th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">
                    SEMESTER
                  </th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">
                    SOURCE
                  </th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      Loading materials...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-8 text-center text-sm"
                      style={{ color: BRAND }}
                    >
                      {error}
                    </td>
                  </tr>
                ) : materials.length > 0 ? (
                  materials.map((material, index) => {
                    const src = getMaterialSource(material);
                    return (
                      <tr
                        key={material.id}
                        className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-pink-50 transition`}
                      >
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                          {material.title}
                          {material.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                              {material.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                          {getCourseName(material)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                          {getSectionName(material)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                          {getSemesterName(material)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm whitespace-nowrap">
                          {src.type ? (
                            <SecureFileLink
                              material={material}
                              className="inline-flex items-center gap-1.5 hover:underline transition cursor-pointer"
                              style={{ color: BRAND }}
                            >
                              {src.type === "url" ? (
                                <>
                                  <Link className="w-4 h-4" />
                                  <span>Open URL</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-4 h-4" />
                                  <span>View File</span>
                                </>
                              )}
                            </SecureFileLink>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              No source
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditMaterial(material)}
                              className="inline-flex items-center justify-center p-2 rounded-lg transition hover:bg-blue-50"
                              style={{ color: BRAND }}
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="inline-flex items-center justify-center p-2 rounded-lg transition hover:bg-red-50"
                              style={{ color: BRAND }}
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No materials found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile - Scrollable Table */}
          <div className="md:hidden overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Loading materials...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-sm" style={{ color: BRAND }}>
                {error}
              </div>
            ) : materials.length > 0 ? (
              <table className="w-full min-w-max">
                <thead>
                  <tr
                    className="text-white text-xs"
                    style={{ backgroundColor: BRAND }}
                  >
                    <th className="px-3 py-3 text-left font-semibold">TITLE</th>
                    <th className="px-3 py-3 text-left font-semibold">
                      COURSE
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      SECTION
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      SEMESTER
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">
                      SOURCE
                    </th>
                    <th className="px-3 py-3 text-center font-semibold">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material, index) => {
                    const src = getMaterialSource(material);
                    return (
                      <tr
                        key={material.id}
                        className={`border-b text-xs ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-pink-50 transition`}
                      >
                        <td className="px-3 py-3 text-gray-900 font-medium">
                          <p className="max-w-[150px] truncate">
                            {material.title}
                          </p>
                          {material.description && (
                            <p className="text-xs text-gray-500 max-w-[150px] truncate">
                              {material.description}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                          {getCourseName(material)}
                        </td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                          {getSectionName(material)}
                        </td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                          {getSemesterName(material)}
                        </td>
                        <td className="px-3 py-3">
                          {src.type ? (
                            <SecureFileLink
                              material={material}
                              className="inline-flex items-center gap-1 hover:underline transition cursor-pointer"
                              style={{ color: BRAND }}
                            >
                              {src.type === "url" ? (
                                <Link className="w-3 h-3" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                              <span className="text-xs">
                                {src.type === "url" ? "Open URL" : "View File"}
                              </span>
                            </SecureFileLink>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleEditMaterial(material)}
                              className="inline-flex items-center justify-center p-1.5 rounded transition hover:bg-blue-50"
                              style={{ color: BRAND }}
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="inline-flex items-center justify-center p-1.5 rounded transition hover:bg-red-50"
                              style={{ color: BRAND }}
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                No materials found
              </div>
            )}
          </div>
        </div>
      </div>

      <ClassMaterialsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMaterial(null);
        }}
        onSubmit={handleAddMaterial}
        editMaterial={editingMaterial}
      />
    </>
  );
};

export default ClassMaterials;
