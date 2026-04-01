import { useState, useEffect } from 'react'
import { eventsApi } from '../api/events.api'
import { coursesApi } from '../../courses/api/courses.api'
import { sectionsApi } from '../../sections/api/sections.api'

export default function CreateEventModal({ isOpen, onClose, onSuccess, editEvent = null }) {
  const [courses, setCourses] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    type: 'institution',
    title: '',
    description: '',
    location: '',
    color: '#3B82F6',
    courseId: '',
    sectionId: '',
    semesterId: '',
    startTime: '',
    endTime: '',
  })

  useEffect(() => {
    if (isOpen) {
      // Load courses
      coursesApi
        .list()
        .then((res) => {
          // Backend returns { data: courses, meta: {...} }
          const courseList = res.data?.data || []
          setCourses(Array.isArray(courseList) ? courseList : [])
        })
        .catch(() => setCourses([]))

      if (editEvent) {
        setFormData({
          type: editEvent.type,
          title: editEvent.title,
          description: editEvent.description || '',
          location: editEvent.location || '',
          color: editEvent.color || '#3B82F6',
          courseId: editEvent.courseId || '',
          sectionId: editEvent.sectionId || '',
          semesterId: editEvent.semesterId || '',
          startTime: editEvent.startTime ? new Date(editEvent.startTime).toISOString().slice(0, 16) : '',
          endTime: editEvent.endTime ? new Date(editEvent.endTime).toISOString().slice(0, 16) : '',
        })

        // Load sections if course is selected
        if (editEvent.courseId) {
          sectionsApi
            .list({ courseId: editEvent.courseId })
            .then((res) => {
              const sectionList = res.data || []
              setSections(Array.isArray(sectionList) ? sectionList : [])
            })
            .catch(() => setSections([]))
        }
      } else {
        setSections([])
      }
    }
  }, [isOpen, editEvent])

  // Load sections when course changes
  useEffect(() => {
    if (formData.courseId && formData.type !== 'institution') {
      setSections([])
      setFormData((prev) => ({ ...prev, sectionId: '' }))

      sectionsApi
        .list({ courseId: formData.courseId })
        .then((res) => {
          const sectionList = res.data || []
          setSections(Array.isArray(sectionList) ? sectionList : [])
        })
        .catch(() => setSections([]))
    } else {
      setSections([])
    }
  }, [formData.courseId, formData.type])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        color: formData.color || undefined,
        semesterId: formData.semesterId || undefined,
        courseId: formData.courseId || undefined,
        sectionId: formData.sectionId || undefined,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
      }

      if (editEvent) {
        await eventsApi.update(editEvent.id, payload)
      } else {
        await eventsApi.create(payload)
      }

      setFormData({
        type: 'institution',
        title: '',
        description: '',
        location: '',
        color: '#3B82F6',
        courseId: '',
        sectionId: '',
        semesterId: '',
        startTime: '',
        endTime: '',
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{editEvent ? 'Edit Event' : 'Create Event'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            >
              <option value="institution">Institution-wide</option>
              <option value="course">Course</option>
              <option value="section">Section</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Semester Final Exam"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Event details…"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Auditorium, Room 101"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calendar Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* Course (if type is course or section) */}
          {formData.type !== 'institution' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course *
              </label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
              >
                <option value="">Select a course</option>
                {Array.isArray(courses) && courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section (only show if course is selected and type is 'section') */}
          {formData.type === 'section' && formData.courseId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section *
              </label>
              <select
                name="sectionId"
                value={formData.sectionId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
              >
                <option value="">Select a section</option>
                {Array.isArray(sections) && sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b1142]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#6b1142] text-white rounded-lg text-sm font-medium hover:bg-[#5a0d38] disabled:opacity-50"
            >
              {loading ? 'Saving...' : editEvent ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
