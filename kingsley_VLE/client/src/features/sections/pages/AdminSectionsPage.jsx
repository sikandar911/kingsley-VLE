import { useState, useEffect, useCallback } from "react";
import { sectionsApi } from "../api/sections.api";
import { coursesApi } from "../../courses/api/courses.api";
import SectionFormModal from "../components/SectionFormModal";
import CustomDropdown from "../../classRecords/components/CustomDropdown";

const BRAND = "#6b1142";

const formatSchedule = (section) => {
  if (!section.daysOfWeek) return <span className="text-gray-300">—</span>;

  // Already comes as comma-separated string (e.g., "Monday, Wednesday, Friday")
  let schedule = section.daysOfWeek;

  if (section.startTime && section.endTime) {
    schedule += ` ${section.startTime}-${section.endTime}`;
  } else if (section.startTime) {
    schedule += ` ${section.startTime}`;
  } else if (section.endTime) {
    schedule += ` (ends ${section.endTime})`;
  }

  return schedule;
};

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
      <div className="panel overflow-visible">
        <div className="panel-header overflow-visible">
          {/* Filter by course */}
          <div className="w-auto sm:w-auto sm:min-w-[280px] relative z-10">
            <CustomDropdown
              options={[
                { id: "", name: "All Courses" },
                ...courses.map((c) => ({
                  id: c.id,
                  name: c.title,
                })),
              ]}
              value={filterCourseId}
              onChange={(val) => setFilterCourseId(val)}
              placeholder="Select course…"
              isSmallScreen={false}
              BRAND={BRAND}
              dropdownAlign="right"
            />
          </div>
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
                  <th className="whitespace-nowrap">Class Schedule</th>
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
                    <td className="text-gray-600 whitespace-nowrap">
                      {formatSchedule(section)}
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
                          className="btn-icon hover:bg-blue-50"
                          title="Edit"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b1d3e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteId(section.id)}
                          className="btn-icon hover:bg-red-50"
                          title="Delete"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b1d3e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
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
