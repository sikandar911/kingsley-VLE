import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { enrollmentsApi } from '../../../features/enrollments/api/enrollments.api'
import AssignmentsTab from './components/AssignmentsTab'
import MaterialsTab from './components/MaterialsTab'

// ── Tab IDs ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'assignments', label: 'Assignments' },
  { id: 'materials', label: 'Materials' },
]

// ── Main CourseProfilePage ─────────────────────────────────────────────────
export default function CourseProfilePage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('assignments')
  const [course, setCourse] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadCourseInfo = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!user?.id) return

        const res = await enrollmentsApi.listByUser(user.id)
        const enrollments = Array.isArray(res.data) ? res.data : []
        const found = enrollments.find((e) => e.courseId === courseId || e.course?.id === courseId)

        if (!found) {
          setError('Course not found in your enrollments.')
          return
        }

        setEnrollment(found)
        setCourse(found.course || { id: courseId, title: 'Course' })
      } catch (err) {
        console.error('Error loading course:', err)
        setError('Failed to load course information.')
      } finally {
        setLoading(false)
      }
    }

    loadCourseInfo()
  }, [courseId, user])

  const courseTitle = course?.title || 'Course'
  const sectionName = enrollment?.section?.name || ''
  const avatarLetter = courseTitle.charAt(0).toUpperCase()
  const sectionId = enrollment?.sectionId || enrollment?.section?.id || null

  // Loading skeleton for header
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-36 shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate('/student/courses')}
            style={{ backgroundColor: '#6b1d3e' }}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition"
          >
            ← Back to My Courses
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Course Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
          {/* Back button */}
          <button
            onClick={() => navigate('/student/courses')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 flex-shrink-0"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Course Avatar */}
          <div
            style={{ backgroundColor: '#6b1d3e' }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
          >
            {avatarLetter}
          </div>

          {/* Course name & section */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate leading-tight">
              {courseTitle}
            </h1>
            {sectionName && (
              <p className="text-xs text-gray-500 leading-tight">Section {sectionName}</p>
            )}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-gray-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#6b1d3e] text-[#6b1d3e]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {/* Grade & Performance - placeholder / coming soon */}
          <button
            className="px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-gray-300 cursor-not-allowed"
            title="Coming soon"
            disabled
          >
            Grade &amp; Performance
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
        {activeTab === 'assignments' && (
          <AssignmentsTab courseId={courseId} sectionId={sectionId} />
        )}
        {activeTab === 'materials' && (
          <MaterialsTab courseId={courseId} sectionId={sectionId} />
        )}
      </div>
    </div>
  )
}
