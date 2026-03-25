import { useState, useEffect, useCallback } from 'react'
import { coursesApi } from '../api/courses.api'
import CourseFormModal from '../components/CourseFormModal'

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editCourse, setEditCourse] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await coursesApi.list({ search, limit: 100 })
      setCourses(res.data.courses || [])
      setTotal(res.data.total || 0)
    } catch {
      // error silently handled
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(fetchCourses, 300)
    return () => clearTimeout(timer)
  }, [fetchCourses])

  const handleCreate = () => {
    setEditCourse(null)
    setShowModal(true)
  }

  const handleEdit = (course) => {
    setEditCourse(course)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    setDeleteLoading(true)
    try {
      await coursesApi.delete(id)
      setDeleteId(null)
      fetchCourses()
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">Manage all courses in the system</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          + Add Course
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">📚</div>
          <div>
            <p className="stat-label">Total Courses</p>
            <p className="stat-value">{total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">🏫</div>
          <div>
            <p className="stat-label">Total Sections</p>
            <p className="stat-value">
              {courses.reduce((a, c) => a + (c._count?.sections || 0), 0)}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--orange">🎓</div>
          <div>
            <p className="stat-label">Total Enrollments</p>
            <p className="stat-value">
              {courses.reduce((a, c) => a + (c._count?.enrollments || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Table panel */}
      <div className="panel">
        <div className="panel-header">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="search-input"
          />
          <span className="text-sm text-gray-500">{total} course{total !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="panel-loading">
            <div className="spinner" />
          </div>
        ) : courses.length === 0 ? (
          <p className="table-empty">No courses found. Create your first course to get started.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Semester</th>
                  <th>Description</th>
                  <th>Sections</th>
                  <th>Enrollments</th>
                  <th>Assignments</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <p className="td-name">{course.title}</p>
                    </td>
                    <td>
                      {course.semester
                        ? <span className="badge badge-id">{course.semester.name}{course.semester.year ? ` (${course.semester.year})` : ''}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="text-gray-500 max-w-xs truncate">
                      {course.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td>
                      <span className="badge badge-id">{course._count?.sections ?? 0}</span>
                    </td>
                    <td>
                      <span className="badge badge-active">{course._count?.enrollments ?? 0}</span>
                    </td>
                    <td>
                      <span className="badge badge-inactive">{course._count?.assignments ?? 0}</span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button
                          onClick={() => handleEdit(course)}
                          className="btn-icon text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteId(course.id)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <CourseFormModal
          editCourse={editCourse}
          onClose={() => { setShowModal(false); setEditCourse(null) }}
          onSaved={() => { setShowModal(false); setEditCourse(null); fetchCourses() }}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Delete Course?</h3>
              <p className="text-sm text-gray-600">
                This will permanently delete the course and all its sections. This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleteLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteLoading ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
