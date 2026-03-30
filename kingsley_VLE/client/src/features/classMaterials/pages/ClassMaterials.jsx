import React, { useState, useEffect } from "react";
import { Search, Plus, Eye, Edit2, Trash2 } from "lucide-react";
import ClassMaterialsModal from "../components/ClassMaterialsModal";
import { classMaterialsApi } from "../api/classMaterials.api";
import { coursesApi } from "../../courses/api/courses.api";

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

  // Relationship maps built from sections data
  const [relationshipMap, setRelationshipMap] = useState({});

  // Fetch all courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesApi.list({ limit: 200 });
        const coursesList = response.data?.courses || [];
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
        const [sectionsRes, semestersRes] = await Promise.all([
          classMaterialsApi.getSections(),
          classMaterialsApi.getSemesters(),
        ]);

        const sectionsData = Array.isArray(sectionsRes.data)
          ? sectionsRes.data
          : sectionsRes || [];
        const semestersData = Array.isArray(semestersRes.data)
          ? semestersRes.data
          : semestersRes || [];

        setSections(sectionsData);
        setSemesters(semestersData);
        setFilteredSections(sectionsData);
        setFilteredSemesters(semestersData);

        // Build relationship map from sections
        const map = {};
        sectionsData.forEach((section) => {
          const courseId = section.courseId;
          const semesterId = section.semesterId;
          const sectionId = section.id;

          if (!map[courseId]) map[courseId] = { sections: [], semesters: [] };
          if (!map[courseId].sections.includes(sectionId)) {
            map[courseId].sections.push(sectionId);
          }
          if (semesterId && !map[courseId].semesters.includes(semesterId)) {
            map[courseId].semesters.push(semesterId);
          }
        });
        setRelationshipMap(map);
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
      }
    };
    fetchDropdownData();
  }, []);

  // Filter dropdowns based on current selections using relationship map
  useEffect(() => {
    let newFilteredCourses = courses;
    let newFilteredSections = sections;
    let newFilteredSemesters = semesters;

    if (selectedCourse && relationshipMap[selectedCourse]) {
      // If course selected, show only its sections and semesters
      const relatedSectionIds = relationshipMap[selectedCourse].sections;
      const relatedSemesterIds = relationshipMap[selectedCourse].semesters;
      newFilteredSections = sections.filter((s) =>
        relatedSectionIds.includes(s.id),
      );
      newFilteredSemesters = semesters.filter((s) =>
        relatedSemesterIds.includes(s.id),
      );
    }

    setFilteredCourses(newFilteredCourses);
    setFilteredSections(newFilteredSections);
    setFilteredSemesters(newFilteredSemesters);
  }, [selectedCourse, relationshipMap, courses, sections, semesters]);

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

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
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
            className="flex items-center justify-center gap-2 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-white"
            style={{ backgroundColor: "#611936" }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Add New Material</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        <div
          className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          style={{ background: "linear-gradient(to right, #6b1d3e, #5a1630)" }}
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by material title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 placeholder-gray-400"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <select
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                <option value="">All Courses ({filteredCourses.length})</option>
                {filteredCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedSection}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                <option value="">
                  All Sections ({filteredSections.length})
                </option>
                {filteredSections.map((section) => (
                  <option key={section?.id} value={section?.id}>
                    {section?.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSemester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                <option value="">
                  All Semesters ({filteredSemesters.length})
                </option>
                {filteredSemesters.map((semester) => (
                  <option key={semester?.id} value={semester?.id}>
                    {semester?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className="text-white"
                  style={{ backgroundColor: "#6b1d3e" }}
                >
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
                    FILE
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
                      style={{ color: "#6b1d3e" }}
                    >
                      {error}
                    </td>
                  </tr>
                ) : materials.length > 0 ? (
                  materials.map((material, index) => (
                    <tr
                      key={material.id}
                      className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition`}
                    >
                      <td className="px-4 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                        {material.title}
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
                        {material.file?.name && (
                          <a
                            href={material.file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              {material.file.name}
                            </span>
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(material.id)}
                            className="inline-flex items-center justify-center p-2 rounded-lg transition hover:bg-red-50"
                            style={{ color: "#6b1d3e" }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

          <div className="md:hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">Loading materials...</p>
              </div>
            ) : materials.length > 0 ? (
              <div className="divide-y">
                {materials.map((material) => (
                  <div key={material.id} className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        Title
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {material.title}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">
                          Course
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          {getCourseName(material.courseId)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">
                          Section
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          {getSectionName(material.sectionId)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">
                          Semester
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          {getSemesterName(material.semesterId)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-medium">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-medium">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(material.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: "#f5f1f5", color: "#6b1d3e" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">No materials found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ClassMaterialsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddMaterial}
        />
      )}
    </>
  );
};

export default ClassMaterials;
