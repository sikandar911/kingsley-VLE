import { useState, useEffect, useCallback } from 'react'
import { enrollmentsApi } from '../api/enrollments.api'
import { coursesApi } from '../../courses/api/courses.api'
import { academicApi } from '../../academic/api/academic.api'
import EnrollmentFormModal from '../components/EnrollmentFormModal'
import TeacherCourseModal from '../components/TeacherCourseModal'

export default function AdminEnrollmentsPage() {
  const [tab, setTab] = useState('students')

  // ── Student enrollments ──
  const [enrollments, setEnrollments] = useState([])
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [deleteEnrollId, setDeleteEnrollId] = useState(null)
  const [deleteEnrollLoading, setDeleteEnrollLoading] = useState(false)

  // ── Teacher assignments ──
  const [teacherCourses, setTeacherCourses] = useState([])
  const [teacherCoursesLoading, setTeacherCoursesLoading] = useState(true)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [deleteTeacherId, setDeleteTeacherId] = useState(null)
  const [deleteTeacherLoading, setDeleteTeacherLoading] = useState(false)

  // ── Filters ──
  const [courses, setCourses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [filterCourseId, setFilterCourseId] = useState('')
  const [filterSemesterId, setFilterSemesterId] = useState('')

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 200 }),
      academicApi.semesters.list(),
    ]).then(([c, s]) => {
      setCourses(c.data.courses || [])
      setSemesters(s.data || [])
    })
  }, [])

  const fetchEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true)
    try {
      const params = {}
      if (filterCourseId) params.courseId = filterCourseId
      if (filterSemesterId) params.semesterId = filterSemesterId
      const res = await enrollmentsApi.list(params)
      setEnrollments(res.data || [])
    } finally {
      setEnrollmentsLoading(false)
    }
  }, [filterCourseId, filterSemesterId])

  const fetchTeacherCourses = useCallback(async () => {
    setTeacherCoursesLoading(true)
    try {
      const params = {}
      if (filterCourseId) params.courseId = filterCourseId
      const res = await enrollmentsApi.teachers.list(params)
      setTeacherCourses(res.data || [])
    } finally {
      setTeacherCoursesLoading(false)
    }
  }, [filterCourseId])

  useEffect(() => { fetchEnrollments() }, [fetchEnrollments])
  useEffect(() => { fetchTeacherCourses() }, [fetchTeacherCourses])

  const deleteEnrollment = async (id) => {
    setDeleteEnrollLoading(true)
    try {
      await enrollmentsApi.delete(id)
      setDeleteEnrollId(null)
      fetchEnrollments()
    } finally {
      setDeleteEnrollLoading(false)
    }
  }

  const deleteTeacherCourse = async (id) => {
    setDeleteTeacherLoading(true)
    try {
      await enrollmentsApi.teachers.delete(id)
      setDeleteTeacherId(null)
      fetchTeacherCourses()
    } finally {
      setDeleteTeacherLoading(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Enrollments</h1>
          <p className="page-subtitle">Manage student enrollments and teacher assignments</p>
        </div>
        {tab === 'students' ? (
          <button className="btn-primary" onClick={() => setShowEnrollModal(true)}>
            + Enroll Student
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setShowTeacherModal(true)}>
            + Assign Teacher
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">🎓</div>
          <div>
            <p className="stat-label">Student Enrollments</p>
            <p className="stat-value">{enrollments.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">👨‍🏫</div>
          <div>
            <p className="stat-label">Teacher Assignments</p>
            <p className="stat-value">{teacherCourses.length}</p>
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className="panel">
        <div className="panel-header flex-wrap gap-3">
          <div className="tab-group">
            <button
              className={`tab-btn ${tab === 'students' ? 'tab-btn--active' : ''}`}
              onClick={() => setTab('students')}
            >
              🎓 Students
            </button>
            <button
              className={`tab-btn ${tab === 'teachers' ? 'tab-btn--active' : ''}`}
              onClick={() => setTab('teachers')}
            >
              👨‍🏫 Teachers
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterCourseId}
              onChange={(e) => setFilterCourseId(e.target.value)}
              className="form-input w-auto min-w-[160px] text-sm py-1.5"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            {tab === 'students' && (
              <select
                value={filterSemesterId}
                onChange={(e) => setFilterSemesterId(e.target.value)}
                className="form-input w-auto min-w-[160px] text-sm py-1.5"
              >
                <option value="">All Semesters</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.year ? `(${s.year})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Student Enrollments Table */}
        {tab === 'students' && (
          enrollmentsLoading ? (
            <div className="panel-loading"><div className="spinner" /></div>
          ) : enrollments.length === 0 ? (
            <p className="table-empty">No enrollments found. Enroll students to get started.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Semester</th>
                    <th>Enrolled On</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((en) => (
                    <tr key={en.id}>
                      <td className="td-name">
                        {en.student?.fullName || en.student?.user?.email || '—'}
                      </td>
                      <td>
                        <span className="badge badge-id">{en.student?.studentId || '—'}</span>
                      </td>
                      <td className="text-gray-700">{en.course?.title || '—'}</td>
                      <td className="text-gray-500">{en.section?.name || '—'}</td>
                      <td className="text-gray-500">
                        {en.semester ? `${en.semester.name}${en.semester.year ? ` (${en.semester.year})` : ''}` : '—'}
                      </td>
                      <td className="text-gray-400 text-xs">
                        {en.enrolledAt
                          ? new Date(en.enrolledAt).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => setDeleteEnrollId(en.id)}
                          className="btn-icon text-red-500 hover:bg-red-50"
                          title="Remove enrollment"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Teacher Assignments Table */}
        {tab === 'teachers' && (
          teacherCoursesLoading ? (
            <div className="panel-loading"><div className="spinner" /></div>
          ) : teacherCourses.length === 0 ? (
            <p className="table-empty">No teacher assignments. Assign teachers to courses.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Teacher ID</th>
                    <th>Course</th>
                    <th>Assigned On</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teacherCourses.map((tc) => (
                    <tr key={tc.id}>
                      <td className="td-name">
                        {tc.teacher?.fullName || '—'}
                      </td>
                      <td>
                        <span className="badge badge-id">{tc.teacher?.teacherId || '—'}</span>
                      </td>
                      <td className="text-gray-700">{tc.course?.title || '—'}</td>
                      <td className="text-gray-400 text-xs">
                        {tc.assignedAt
                          ? new Date(tc.assignedAt).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => setDeleteTeacherId(tc.id)}
                          className="btn-icon text-red-500 hover:bg-red-50"
                          title="Remove assignment"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Enrollment modal */}
      {showEnrollModal && (
        <EnrollmentFormModal
          onClose={() => setShowEnrollModal(false)}
          onSaved={() => { setShowEnrollModal(false); fetchEnrollments() }}
        />
      )}

      {/* Teacher course modal */}
      {showTeacherModal && (
        <TeacherCourseModal
          onClose={() => setShowTeacherModal(false)}
          onSaved={() => { setShowTeacherModal(false); fetchTeacherCourses() }}
        />
      )}

      {/* Delete enrollment confirm */}
      {deleteEnrollId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Remove Enrollment?</h3>
              <p className="text-sm text-gray-600">
                The student will be removed from this course section.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteEnrollId(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={() => deleteEnrollment(deleteEnrollId)}
                  disabled={deleteEnrollLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteEnrollLoading ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete teacher assignment confirm */}
      {deleteTeacherId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Remove Teacher Assignment?</h3>
              <p className="text-sm text-gray-600">
                The teacher will be unassigned from this course.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTeacherId(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={() => deleteTeacherCourse(deleteTeacherId)}
                  disabled={deleteTeacherLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteTeacherLoading ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
