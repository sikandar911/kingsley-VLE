import { useState, useEffect } from 'react'
import { coursesApi } from '../api/courses.api'
import { academicApi } from '../../academic/api/academic.api'

const INITIAL = { title: '', description: '', semesterId: '' }

export default function CourseFormModal({ onClose, onSaved, editCourse }) {
  const isEdit = Boolean(editCourse)
  const [form, setForm] = useState(
    isEdit
      ? { title: editCourse.title || '', description: editCourse.description || '', semesterId: editCourse.semesterId || '' }
      : INITIAL,
  )
  const [semesters, setSemesters] = useState([])
  const [metaLoading, setMetaLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    academicApi.semesters
      .list()
      .then((res) => setSemesters(res.data || []))
      .catch(() => setError('Failed to load semesters'))
      .finally(() => setMetaLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Course title is required')
      return
    }
    if (!form.semesterId) {
      setError('Please select a semester')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        semesterId: form.semesterId,
      }
      if (isEdit) {
        await coursesApi.update(editCourse.id, payload)
      } else {
        await coursesApi.create(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save course')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Course' : 'Create Course'}
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
            <label className="form-label">Course Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Introduction to Computer Science"
              className="form-input"
              disabled={metaLoading}
            />
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
              <option value="">{metaLoading ? 'Loading…' : 'Select semester…'}</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.year ? ` (${s.year})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Brief course description…"
              className="form-input resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || metaLoading} className="btn-primary">
              {loading ? 'Saving…' : isEdit ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
