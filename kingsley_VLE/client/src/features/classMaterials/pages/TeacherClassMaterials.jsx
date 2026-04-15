import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, FileText, Link } from "lucide-react";
import ClassMaterialsModal from "../components/ClassMaterialsModal";
import { classMaterialsApi } from "../api/classMaterials.api";
import { enrollmentsApi } from "../../enrollments/api/enrollments.api";
import { authApi } from "../../../Auth/api/auth.api";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const TeacherClassMaterials = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Teacher's enrollments
  const [teacherEnrollments, setTeacherEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);

  // Filtered options (only what teacher has access to)
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSemesters, setFilteredSemesters] = useState([]);

  // Relationship maps
  const [semesterCourseMap, setSemesterCourseMap] = useState({});
  const [courseSectionMap, setCourseSectionMap] = useState({});

  // Fetch teacher's enrollments and build accessible courses/sections/semesters
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setEnrollmentsLoading(true);

        // Get logged-in teacher's profile ID
        const meRes = await authApi.getMe();
        const teacherProfileId = meRes.data?.teacherProfile?.id;

        if (!teacherProfileId) {
          setError("Teacher profile not found.");
          return;
        }

        // Get teacher's course enrollments
        const enrollRes = await enrollmentsApi.teachers.list({
          teacherId: teacherProfileId,
        });
        const enrollments = Array.isArray(enrollRes.data) ? enrollRes.data : [];
        setTeacherEnrollments(enrollments);

        // Extract unique courses, sections, and semesters from enrollments
        const coursesSet = new Set();
        const sectionsSet = new Set();
        const semesterCourseMapLocal = {};
        const courseSectionMapLocal = {};

        enrollments.forEach((enroll) => {
          // Add course
          if (enroll.course) {
            coursesSet.add(JSON.stringify(enroll.course));
            if (!semesterCourseMapLocal[enroll.semesterId]) {
              semesterCourseMapLocal[enroll.semesterId] = [];
            }
            semesterCourseMapLocal[enroll.semesterId].push(enroll.course.id);
          }

          // Add section
          if (enroll.section) {
            sectionsSet.add(JSON.stringify(enroll.section));
            if (!courseSectionMapLocal[enroll.courseId]) {
              courseSectionMapLocal[enroll.courseId] = [];
            }
            courseSectionMapLocal[enroll.courseId].push(enroll.section.id);
          }
        });

        const coursesList = Array.from(coursesSet).map((c) => JSON.parse(c));
        const sectionsList = Array.from(sectionsSet).map((s) => JSON.parse(s));

        setCourses(coursesList);
        setSections(sectionsList);
        setFilteredCourses(coursesList);
        setFilteredSections([]);
        setSemesterCourseMap(semesterCourseMapLocal);
        setCourseSectionMap(courseSectionMapLocal);

        // Fetch ALL semesters (not just teacher's)
        const allSemestersRes = await classMaterialsApi.getSemesters();
        const allSemestersList = Array.isArray(allSemestersRes.data)
          ? allSemestersRes.data
          : allSemestersRes.data?.data || [];
        setSemesters(allSemestersList);
        setFilteredSemesters(allSemestersList);

        // Auto-select first semester
        if (allSemestersList.length > 0) {
          setSelectedSemester(allSemestersList[0].id);
        }
      } catch (err) {
        console.error("Error fetching teacher data:", err);
        setError("Failed to load your courses. Please try again.");
      } finally {
        setEnrollmentsLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  // Filter courses based on selected semester
  useEffect(() => {
    if (selectedSemester) {
      if (semesterCourseMap[selectedSemester]) {
        const courseIds = semesterCourseMap[selectedSemester];
        setFilteredCourses(courses.filter((c) => courseIds.includes(c.id)));
      } else {
        setFilteredCourses([]);
      }
    } else {
      setFilteredCourses(courses);
    }
    setSelectedCourse("");
    setSelectedSection("");
  }, [selectedSemester, semesterCourseMap, courses]);

  // Filter sections based on selected course
  useEffect(() => {
    if (selectedCourse) {
      if (courseSectionMap[selectedCourse]) {
        const sectionIds = courseSectionMap[selectedCourse];
        setFilteredSections(sections.filter((s) => sectionIds.includes(s.id)));
      } else {
        setFilteredSections([]);
      }
    } else {
      setFilteredSections([]);
    }
    setSelectedSection("");
  }, [selectedCourse, courseSectionMap, sections]);

  // Ensure all semesters are always available
  useEffect(() => {
    setFilteredSemesters(semesters);
  }, [semesters]);

  // Fetch materials when filters change
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

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const handleDeleteMaterial = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await classMaterialsApi.delete(id);
        setMaterials(materials.filter((m) => m.id !== id));
      } catch (err) {
        console.error("Error deleting material:", err);
        alert("Failed to delete material. Please try again.");
      }
    }
  };

  const getCourseName = (material) => {
    if (material.course?.title) return material.course.title;
    const course = courses.find((c) => c.id === material.courseId);
    return course ? course.title : material.courseId;
  };

  const getSectionName = (material) => {
    if (material.section?.name) return material.section.name;
    const section = sections.find((s) => s && s.id === material.sectionId);
    return section ? section.name : material.sectionId;
  };

  const getSemesterName = (material) => {
    if (material.semester?.name) {
      return material.semester.year
        ? `${material.semester.name} (${material.semester.year})`
        : material.semester.name;
    }
    const semester = semesters.find((s) => s && s.id === material.semesterId);
    return semester ? semester.name : material.semesterId;
  };

  const getMaterialUrl = (material) =>
    material.fileUrl || material.file?.fileUrl || null;

  if (enrollmentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse px-4 py-4 md:px-4 lg:px-8 lg:py-8">
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded w-64" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 px-4 py-4 md:px-4 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8 lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Class Materials
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage class materials for your courses.
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
            <span>Add New Material</span>
          </button>
        </div>

        {/* Filters */}
        <div
          className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          style={{ background: "linear-gradient(to right, #6b1d3e, #5a1630)" }}
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search Input */}
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
                    name: `${semester?.name || "Untitled Semester"} ${semester?.year ? `(${semester.year})` : ""}`,
                  })),
                ]}
                value={selectedSemester}
                onChange={(val) => setSelectedSemester(val)}
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
                onChange={(val) => setSelectedCourse(val)}
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
                onChange={(val) => setSelectedSection(val)}
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
                          {getCourseName(material)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {getSectionName(material)}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {getSemesterName(material)}
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
                              onClick={() => handleEditMaterial(material)}
                              className="inline-flex items-center justify-center p-2 rounded-lg transition hover:bg-blue-50"
                              style={{ color: BRAND }}
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMaterial(material.id, material.title)
                              }
                              className="inline-flex items-center justify-center p-2 rounded-lg transition hover:bg-red-50"
                              style={{ color: BRAND }}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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
                    const url = getMaterialUrl(material);
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
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline transition"
                              style={{ color: BRAND }}
                              title={
                                material.fileUrl ? "Open URL" : "View File"
                              }
                            >
                              {material.fileUrl ? (
                                <Link className="w-3 h-3" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                            </a>
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
                              onClick={() =>
                                handleDeleteMaterial(material.id, material.title)
                              }
                              className="inline-flex items-center justify-center p-1.5 rounded transition hover:bg-red-50"
                              style={{ color: BRAND }}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

export default TeacherClassMaterials;
