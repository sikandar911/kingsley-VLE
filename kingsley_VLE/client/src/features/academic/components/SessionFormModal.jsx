import { useState } from 'react'
import { academicApi } from '../api/academic.api'

const INITIAL = { name: '', description: '', startDate: '', endDate: '' }

export default function SessionFormModal({ onClose, onSaved, editSession }) {
  const isEdit = Boolean(editSession)
  const toInputDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '')

  const [form, setForm] = useState(
    isEdit
      ? {
          name: editSession.name || '',
          description: editSession.description || '',
          startDate: toInputDate(editSession.startDate),
          endDate: toInputDate(editSession.endDate),
        }
      : INITIAL,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Session name is required')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }
      if (isEdit) {
        await academicApi.sessions.update(editSession.id, payload)
      } else {
        await academicApi.sessions.create(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Edit Session' : 'Create Session'}
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
            <label className="form-label">Session Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Academic Year 2025-2026"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description…"
              className="form-input resize-none"
            />
          </div>

          <div className="md:form-row">
            <div className="form-group md:mb-0">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : isEdit ? 'Update Session' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
