import React, { useState, useEffect } from "react";
import { Search, Plus, Eye, Edit2, Trash2 } from "lucide-react";
import ClassMaterialsModal from "../components/ClassMaterialsModal";
import { classMaterialsApi } from "../api/classMaterials.api";
import { coursesApi } from "../../courses/api/courses.api";

const ClassMaterials = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("All Courses");
  const [selectedSection, setSelectedSection] = useState("All Sections");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState(["All Courses"]);
  const [sections, setSections] = useState(["All Sections"]);
  const [semesters, setSemesters] = useState(["All Semesters"]);

  // Fetch materials from API based on filters
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        if (selectedCourse !== "All Courses") params.course = selectedCourse;
        if (selectedSection !== "All Sections")
          params.section = selectedSection;
        if (selectedSemester !== "All Semesters")
          params.semester = selectedSemester;
        if (searchTerm) params.search = searchTerm;

        const response = await classMaterialsApi.list(params);
        setMaterials(response.data || response || []);
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

  // Fetch available courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesApi.list({ limit: 200 });
        const coursesList = response.data.courses || [];
        const courseNames = coursesList.map((c) => c.title).filter(Boolean);
        setCourses(["All Courses", ...courseNames]);
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };

    fetchCourses();
  }, []);

  // Fetch sections and semesters from API
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [sectionsRes, semestersRes] = await Promise.all([
          classMaterialsApi.getSections(),
          classMaterialsApi.getSemesters(),
        ]);

        const sectionsData = sectionsRes.data || sectionsRes || [];
        const semestersData = semestersRes.data || semestersRes || [];

        setSections([
          "All Sections",
          ...(Array.isArray(sectionsData)
            ? sectionsData.map((s) =>
                typeof s === "string" ? s : s.name || s.id,
              )
            : []),
        ]);

        setSemesters([
          "All Semesters",
          ...(Array.isArray(semestersData)
            ? semestersData.map((s) =>
                typeof s === "string" ? s : s.name || s.id,
              )
            : []),
        ]);
      } catch (err) {
        console.error("Error fetching dropdown data:", err);
      }
    };

    fetchDropdownData();
  }, []);

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

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
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

        {/* Filter and Search Section */}
        <div
          className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          style={{ background: "linear-gradient(to right, #6b1d3e, #5a1630)" }}
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search Bar */}
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

            {/* Dropdowns and Button */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Courses Dropdown */}
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>

              {/* Sections Dropdown */}
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>

              {/* Semesters Dropdown */}
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 cursor-pointer"
                style={{ "--tw-ring-color": "#6b1d3e" }}
              >
                {semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Desktop Table View */}
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
                    URL
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
                      className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} transition`}
                      style={{ ":hover": { backgroundColor: "#f5f1f5" } }}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#f5f1f5")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor =
                          index % 2 === 0 ? "#ffffff" : "#f9fafb")
                      }
                    >
                      <td className="px-4 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                        {material.title}
                      </td>
                      <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                        {material.course}
                      </td>
                      <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                        {material.section}
                      </td>
                      <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                        {material.semester}
                      </td>
                      <td className="px-4 py-4 text-xs sm:text-sm">
                        <button className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition">
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View File</span>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(material.id)}
                            className="inline-flex items-center justify-center p-2 rounded-lg transition"
                            style={{ color: "#6b1d3e" }}
                            onMouseEnter={(e) =>
                              (e.target.style.backgroundColor = "#f5f1f5")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.backgroundColor = "transparent")
                            }
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
                      No materials found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">Loading materials...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center" style={{ color: "#6b1d3e" }}>
                <p className="text-sm">{error}</p>
              </div>
            ) : materials.length > 0 ? (
              <div className="divide-y">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="p-4 space-y-3 border-b transition"
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#f5f1f5")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                  >
                    {/* Title */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        Title
                      </p>
                      <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                        {material.title}
                      </p>
                    </div>

                    {/* Course and Section */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Course
                        </p>
                        <p className="text-xs sm:text-sm text-gray-700 mt-1">
                          {material.course}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                          Section
                        </p>
                        <p className="text-xs sm:text-sm text-gray-700 mt-1">
                          {material.section}
                        </p>
                      </div>
                    </div>

                    {/* Semester */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">
                        Semester
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700 mt-1">
                        {material.semester}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 py-2.5 rounded-lg hover:bg-blue-100 transition text-xs sm:text-sm font-medium">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 py-2.5 rounded-lg hover:bg-gray-200 transition text-xs sm:text-sm font-medium">
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(material.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition text-xs sm:text-sm font-medium"
                        style={{ backgroundColor: "#f5f1f5", color: "#6b1d3e" }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#ede5f0")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "#f5f1f5")
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
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

      {/* Modal */}
      <ClassMaterialsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddMaterial}
      />
    </>
  );
};

export default ClassMaterials;
