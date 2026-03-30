import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye, Trash2, FileText, Link } from "lucide-react";
import ClassMaterialsModal from "../components/ClassMaterialsModal";
import { classMaterialsApi } from "../api/classMaterials.api";
import { coursesApi } from "../../courses/api/courses.api";

const BRAND = "#6b1d3e";

const ClassMaterials = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedCourse) params.courseId = selectedCourse;
      if (selectedSection) params.sectionId = selectedSection;
      if (selectedSemester) params.semesterId = selectedSemester;

      const response = await classMaterialsApi.list(params);
      // API returns { materials: [...], total, page, limit }
      const data = response.data?.materials || response.data || [];
      // Client-side search
      setMaterials(
        searchTerm
          ? data.filter((m) =>
              m.title?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : data
      );
    } catch (err) {
      console.error("Error fetching materials:", err);
      setError("Failed to load materials. Please try again.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedSection, selectedSemester, searchTerm]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [coursesRes, sectionsRes, semestersRes] = await Promise.all([
          coursesApi.list({ limit: 200 }),
          classMaterialsApi.getSections(),
          classMaterialsApi.getSemesters(),
        ]);
        setCourses(coursesRes.data?.courses || []);
        setSections(sectionsRes.data || sectionsRes || []);
        setSemesters(semestersRes.data || semestersRes || []);
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    try {
      await classMaterialsApi.delete(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting material:", err);
      alert("Failed to delete material. Please try again.");
    }
  };

  const handleAddMaterial = async (formData) => {
    await classMaterialsApi.create(formData);
    // Refetch so the list is always in sync with the server
    fetchMaterials();
  };

  const getMaterialUrl = (material) =>
    material.fileUrl || material.file?.fileUrl || null;

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        {/* Header */}
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
            style={{ backgroundColor: BRAND }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Add New Material</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Filters */}
        <div
          className="rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          style={{ background: "linear-gradient(to right, #6b1d3e, #5a1630)" }}
        >
          <div className="flex flex-col gap-3 sm:gap-4">
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
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Sections</option>
                {Array.isArray(sections) && sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-4 py-2.5 sm:py-3 bg-white rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Semesters</option>
                {Array.isArray(semesters) && semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
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
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">TITLE</th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">COURSE</th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">SECTION</th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">SEMESTER</th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">SOURCE</th>
                  <th className="px-4 py-4 text-left text-xs sm:text-sm font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
                      Loading materials...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-sm" style={{ color: BRAND }}>
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
                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{material.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {material.course?.title || "â€”"}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {material.section?.name || "â€”"}
                        </td>
                        <td className="px-4 py-4 text-xs sm:text-sm text-gray-700">
                          {material.semester?.name || "â€”"}
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
                              <span>{material.fileUrl ? "Open URL" : "View File"}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">No source</span>
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 text-sm">
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
              <div className="p-8 text-center text-gray-500 text-sm">Loading materials...</div>
            ) : error ? (
              <div className="p-8 text-center text-sm" style={{ color: BRAND }}>{error}</div>
            ) : materials.length > 0 ? (
              <div className="divide-y">
                {materials.map((material) => {
                  const url = getMaterialUrl(material);
                  return (
                    <div key={material.id} className="p-4 space-y-3 border-b">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{material.title}</p>
                        {material.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{material.description}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Course</p>
                          <p className="text-xs text-gray-700 mt-1">{material.course?.title || "â€”"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Section</p>
                          <p className="text-xs text-gray-700 mt-1">{material.section?.name || "â€”"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Semester</p>
                          <p className="text-xs text-gray-700 mt-1">{material.semester?.name || "â€”"}</p>
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
                            {material.fileUrl ? <Link className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {material.fileUrl ? "Open URL" : "View File"}
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 py-2.5 rounded-lg hover:bg-red-100 transition text-xs font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No materials found</div>
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
