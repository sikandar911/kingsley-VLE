import { useState, useEffect } from 'react'
import { enrollmentsApi } from '../api/enrollments.api'
import { coursesApi } from '../../courses/api/courses.api'
import { academicApi } from '../../academic/api/academic.api'
import { adminApi } from '../../../Dashboard/Admin/api/admin.api'

const INITIAL = { studentId: '', courseId: '', sectionId: '', semesterId: '' }

export default function EnrollmentFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL)
  const [courses, setCourses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [students, setStudents] = useState([])
  const [sections, setSections] = useState([])
  const [metaLoading, setMetaLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 200 }),
      academicApi.semesters.list(),
      adminApi.listUsers('student'),
    ])
      .then(([coursesRes, semestersRes, studentsRes]) => {
        setCourses(coursesRes.data?.data || [])
        setSemesters(semestersRes.data || [])
        setStudents(studentsRes.data || [])
      })
      .catch(() => setError('Failed to load form data'))
      .finally(() => setMetaLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'courseId') {
      const course = courses.find((c) => c.id === value)
      setSections(course?.sections || [])
      setForm((prev) => ({ ...prev, courseId: value, sectionId: '' }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.studentId) {
      setError('Please select a student')
      return
    }
    if (!form.courseId) {
      setError('Please select a course')
      return
    }
    if (!form.sectionId) {
      setError('Please select a section')
      return
    }
    if (!form.semesterId) {
      setError('Please select a semester')
      return
    }
    setError('')
    setLoading(true)
    try {
      await enrollmentsApi.create({
        studentId: form.studentId,
        courseId: form.courseId,
        sectionId: form.sectionId,
        semesterId: form.semesterId,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create enrollment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">Enroll Student</h2>
          <button onClick={onClose} className="btn-icon text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Student *</label>
            <select
              name="studentId"
              value={form.studentId}
              onChange={handleChange}
              className="form-input"
              disabled={metaLoading}
            >
              <option value="">{metaLoading ? 'Loading…' : 'Select student…'}</option>
              {students.map((s) => (
                <option key={s.studentProfile?.id} value={s.studentProfile?.id}>
                  {s.studentProfile?.fullName || s.email} — {s.studentProfile?.studentId || ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Course *</label>
            <select
              name="courseId"
              value={form.courseId}
              onChange={handleChange}
              className="form-input"
              disabled={metaLoading}
            >
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Section *</label>
            <select
              name="sectionId"
              value={form.sectionId}
              onChange={handleChange}
              className="form-input"
              disabled={!form.courseId}
            >
              <option value="">
                {form.courseId ? 'Select section…' : 'Select a course first'}
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semester *</label>
            <select
              name="semesterId"
              value={form.semesterId}
              onChange={handleChange}
              className="form-input"
              disabled={metaLoading}
            >
              <option value="">Select semester…</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.year ? `(${s.year})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || metaLoading} className="btn-primary">
              {loading ? 'Enrolling…' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
