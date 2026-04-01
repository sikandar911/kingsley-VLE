import { useState, useEffect } from 'react'
import { sectionsApi } from '../api/sections.api'
import { coursesApi } from '../../courses/api/courses.api'
import { academicApi } from '../../academic/api/academic.api'
import { adminApi } from '../../../Dashboard/Admin/api/admin.api'

const INITIAL = {
  name: '',
  courseId: '',
  semesterId: '',
  assignedTeacherId: '',
}

export default function SectionFormModal({ onClose, onSaved, editSection }) {
  const isEdit = Boolean(editSection)
  const [form, setForm] = useState(
    isEdit
      ? {
          name: editSection.name || '',
          courseId: editSection.courseId || '',
          semesterId: editSection.semesterId || '',
          assignedTeacherId: editSection.assignedTeacherId || '',
        }
      : INITIAL,
  )
  const [courses, setCourses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [teachers, setTeachers] = useState([])
  const [metaLoading, setMetaLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: 200 }),
      academicApi.semesters.list(),
      adminApi.listUsers('teacher'),
    ])
      .then(([coursesRes, semestersRes, teachersRes]) => {
        setCourses(coursesRes.data?.data || [])
        setSemesters(semestersRes.data || [])
        setTeachers(teachersRes.data || [])
      })
      .catch(() => setError('Failed to load form data'))
      .finally(() => setMetaLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'courseId') {
      // Auto-populate semester from the selected course
      const course = courses.find((c) => c.id === value)
      setForm((prev) => ({
        ...prev,
        courseId: value,
        semesterId: course?.semesterId || prev.semesterId || '',
      }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Section name is required')
      return
    }
    if (!form.courseId) {
      setError('Please select a course')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        courseId: form.courseId,
        semesterId: form.semesterId || null,
        assignedTeacherId: form.assignedTeacherId || null,
      }
      if (isEdit) {
        await sectionsApi.update(editSection.id, payload)
      } else {
        await sectionsApi.create(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save section')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Section' : 'Create Section'}
          </h2>
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
            <label className="form-label">Section Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Section A"
              className="form-input"
              disabled={metaLoading}
            />
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
              <option value="">{metaLoading ? 'Loading…' : 'Select course…'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semester (optional)</label>
            <select
              name="semesterId"
              value={form.semesterId}
              onChange={handleChange}
              className="form-input"
              disabled={metaLoading}
            >
              <option value="">No semester selected</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.year ? `(${s.year})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Teacher (optional)</label>
            <select
              name="assignedTeacherId"
              value={form.assignedTeacherId}
              onChange={handleChange}
              className="form-input"
              disabled={metaLoading}
            >
              <option value="">No teacher assigned</option>
              {teachers.map((t) => (
                <option key={t.teacherProfile?.id} value={t.teacherProfile?.id}>
                  {t.teacherProfile?.fullName || t.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || metaLoading} className="btn-primary">
              {loading ? 'Saving…' : isEdit ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
