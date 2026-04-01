import { useState, useEffect, useCallback } from "react";
import { sectionsApi } from "../api/sections.api";
import { coursesApi } from "../../courses/api/courses.api";
import SectionFormModal from "../components/SectionFormModal";

export default function AdminSectionsPage() {
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filterCourseId, setFilterCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    coursesApi
      .list({ limit: 200 })
      .then((res) => setCourses(res.data?.data || []));
  }, []);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCourseId) params.courseId = filterCourseId;
      const res = await sectionsApi.list(params);
      setSections(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterCourseId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleCreate = () => {
    setEditSection(null);
    setShowModal(true);
  };

  const handleEdit = (section) => {
    setEditSection(section);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await sectionsApi.delete(id);
      setDeleteId(null);
      fetchSections();
    } catch {
      // silent
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="md:page-container px-4 py-4 md:px-4 lg:px-8  lg:py-8">
      {/* Header */}
      <div className="md:page-header mb-4">
        <div>
          <h1 className="page-title">Sections</h1>
          <p className="page-subtitle">Manage sections for courses</p>
        </div>
        <button className="btn-primary mt-2 lg:mt-0" onClick={handleCreate}>
          + Add Section
        </button>
      </div>

      {/* Table panel */}
      <div className="panel">
        <div className="panel-header">
          {/* Filter by course */}
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="form-input w-full sm:w-auto sm:min-w-[300px] text-xs sm:text-sm"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title.length > 40
                  ? c.title.substring(0, 37) + "..."
                  : c.title}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="panel-loading">
            <div className="spinner" />
          </div>
        ) : sections.length === 0 ? (
          <p className="table-empty">
            No sections found. Add sections to courses to organize students.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Section Name</th>
                  <th className="whitespace-nowrap">Course</th>
                  <th className="whitespace-nowrap">Semester</th>
                  <th className="whitespace-nowrap">Assigned Teacher</th>
                  <th className="whitespace-nowrap">Students</th>
                  <th className="whitespace-nowrap">Actions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.id}>
                    <td className="td-name whitespace-nowrap">
                      {section.name}
                    </td>
                    <td className="text-gray-700 ">
                      {section.course?.title || (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-gray-500 whitespace-nowrap">
                      {section.semester ? (
                        `${section.semester.name}${section.semester.year ? ` (${section.semester.year})` : ""}`
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {section.assignedTeacher ? (
                        <span className="text-gray-700">
                          {section.assignedTeacher.fullName}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="badge badge-active">
                        {section._count?.enrollments ?? 0}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button
                          onClick={() => handleEdit(section)}
                          className="btn-icon text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteId(section.id)}
                          className="btn-icon text-red-500 hover:bg-red-50"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <SectionFormModal
          editSection={editSection}
          onClose={() => {
            setShowModal(false);
            setEditSection(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditSection(null);
            fetchSections();
          }}
        />
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Delete Section?
              </h3>
              <p className="text-sm text-gray-600">
                This will permanently delete the section and remove all student
                enrollments in it.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleteLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteLoading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
