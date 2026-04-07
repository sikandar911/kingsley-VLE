import React, { useState, useEffect } from "react";
import { Search, Plus, Eye, Trash2, FileText, Link } from "lucide-react";
import ClassMaterialsModal from "../components/ClassMaterialsModal";
import { classMaterialsApi } from "../api/classMaterials.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const ClassMaterials = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Fetch all courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await classMaterialsApi.getCourses();
        const coursesList = response.data?.data || response.data?.courses || [];
        console.log("Courses fetched:", coursesList);
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

        console.log("Courses data:", coursesList);
        console.log("Sections data:", sectionsData);
        console.log("Semesters data:", semestersData);

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

        console.log("Semester course map:", semCxMap);
        console.log("Course section map:", cxSecMap);

        setSemesterCourseMap(semCxMap);
        setCourseSectionMap(cxSecMap);
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
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
        console.log(
          "Filtering courses for semester:",
          selectedSemester,
          courseIds,
        );
        setFilteredCourses(courses.filter((c) => courseIds.includes(c.id)));
      } else {
        // Semester selected but has no courses - show empty
        console.log("Semester selected but has no courses");
        setFilteredCourses([]);
      }
    } else {
      // No semester selected - show all courses
      console.log("No semester selected - showing all courses");
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
        console.log(
          "Filtering sections for course:",
          selectedCourse,
          sectionIds,
        );
        setFilteredSections(sections.filter((s) => sectionIds.includes(s.id)));
      } else {
        // Course selected but has no sections - show empty
        console.log("Course selected but has no sections");
        setFilteredSections([]);
      }
    } else {
      // No course selected - show all sections
      console.log("No course selected - showing all sections");
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
  }, [selectedCourse, selectedSection, selectedSemester, searchTerm]);

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
  };

  const handleSectionChange = (sectionId) => {
    setSelectedSection(sectionId);
  };

  const handleSemesterChange = (semesterId) => {
    setSelectedSemester(semesterId);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      try {
        await classMaterialsApi.delete(id);
        setMaterials(materials.filter((m) => m.id !== id));
      } catch (err) {
        console.error("Error deleting material:", err);
        alert("Failed to delete material. Please try again.");
      }
    }
  };

  const handleAddMaterial = async (formData) => {
    try {
      const response = await classMaterialsApi.create(formData);
      setMaterials([...materials, response.data || response]);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error creating material:", err);
      alert("Failed to create material. Please try again.");
    }
  };

  const getCourseName = (id) => {
    const course = courses.find((c) => c.id === id);
    return course ? course.title : id;
  };

  const getSectionName = (id) => {
    const section = sections.find((s) => s && s.id === id);
    return section ? section.name : id;
  };

  const getSemesterName = (id) => {
    const semester = semesters.find((s) => s && s.id === id);
    return semester ? semester.name : id;
  };

  const getMaterialUrl = (material) =>
    material.fileUrl || material.file?.fileUrl || null;

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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-white mt-2 md:mt-3 lg:mt-0"
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className=" sm:inline">Add New Material</span>
          </button>
        </div>

        {/* Filters */}
        <div
          className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          style={{ background: "linear-gradient(to right, #6b1d3e, #5a1630)" }}
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search Input div*/}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by material title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 placeholder-gray-400"
                style={{ "--tw-ring-color": BRAND }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <CustomDropdown
                options={[
                  {
                    id: "",
                    name: `All Semesters (${filteredSemesters.length})`,
                  },
                  ...filteredSemesters.map((semester) => ({
                    id: semester?.id,
                    name: semester?.name,
                  })),
                ]}
                value={selectedSemester}
                onChange={(val) => handleSemesterChange(val)}
                placeholder="Select semester…"
                isSmallScreen={false}
                BRAND={BRAND}
              />

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
                placeholder={
                  !selectedSemester ? "Select semester first" : "Select course…"
                }
                isSmallScreen={false}
                BRAND={BRAND}
                disabled={!selectedSemester}
              />

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
                placeholder={
                  !selectedCourse ? "Select course first" : "Select section…"
                }
                isSmallScreen={false}
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
                    const url = getMaterialUrl(material);
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
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {getCourseName(material.courseId)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {getSectionName(material.sectionId)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {getSemesterName(material.semesterId)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 hover:underline transition"
                              style={{ color: BRAND }}
                            >
                              {material.fileUrl ? (
                                <Link className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              <span>
                                {material.fileUrl ? "Open URL" : "View File"}
                              </span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              No source
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
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

          {/* Mobile */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Loading materials...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-sm" style={{ color: BRAND }}>
                {error}
              </div>
            ) : materials.length > 0 ? (
              <div className="divide-y">
                {materials.map((material) => {
                  const url = getMaterialUrl(material);
                  return (
                    <div key={material.id} className="p-4 space-y-3 border-b">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {material.title}
                        </p>
                        {material.description && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {material.description}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">
                            Course
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            {getCourseName(material.courseId)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">
                            Section
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            {getSectionName(material.sectionId)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">
                            Semester
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            {getSemesterName(material.semesterId)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-white transition"
                            style={{ backgroundColor: BRAND }}
                          >
                            {material.fileUrl ? (
                              <Link className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                            {material.fileUrl ? "Open URL" : "View File"}
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 py-2.5 rounded-lg hover:bg-red-100 transition text-xs font-medium"
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
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddMaterial}
      />
    </>
  );
};

export default ClassMaterials;
