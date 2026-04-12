import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { Link } from 'react-router-dom'
import { enrollmentsApi } from '../../../features/enrollments/api/enrollments.api'
import { assignmentsApi } from '../../../features/assignments/api/assignments.api'
import { classRecordsApi } from '../../../features/classRecords/api/classRecords.api'
import { eventsApi } from '../../../features/events/api/events.api'

export default function StudentDashboard() {
  const { user } = useAuth()
  const profile = user?.studentProfile
  const name = profile?.fullName || user?.email

  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [classRecordings, setClassRecordings] = useState([])
  const [events, setEvents] = useState([])
  const [courseMap, setCourseMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [coursesRes, assignmentsRes, recordingsRes, eventsRes] = await Promise.all([
          enrollmentsApi.listByUser(user.id),
          assignmentsApi.list(),
          classRecordsApi.list(),
          eventsApi.list(),
        ])

        // Handle courses/enrollments
        const coursesList = Array.isArray(coursesRes.data) ? coursesRes.data : []
        setCourses(coursesList)

        // Build enrollment maps for filtering
        const enrolledCourseIds = new Set()
        const enrolledSectionIds = new Set()
        const courseMapping = {}

        coursesList.forEach((enrollment) => {
          if (enrollment.courseId) {
            enrolledCourseIds.add(enrollment.courseId)
            courseMapping[enrollment.courseId] = enrollment.course?.title || 'Unknown Course'
          }
          if (enrollment.sectionId) {
            enrolledSectionIds.add(enrollment.sectionId)
          }
        })

        setCourseMap(courseMapping)

        // Filter and prepare assignments (exclude submitted ones)
        const assignmentsList = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []
        
        // Fetch submissions for all assignments to filter out submitted ones
        const submittedAssignmentIds = new Set()
        try {
          await Promise.all(
            assignmentsList.map(async (assignment) => {
              try {
                const subRes = await assignmentsApi.getSubmissions(assignment.id)
                const submissions = Array.isArray(subRes.data) ? subRes.data : []
                if (submissions.length > 0) {
                  submittedAssignmentIds.add(assignment.id)
                }
              } catch {
                // silently skip if a specific assignment's submissions fail
              }
            })
          )
        } catch (err) {
          console.error('Error checking submissions:', err)
        }

        const filteredAssignments = assignmentsList.filter((a) => !submittedAssignmentIds.has(a.id))
        setAssignments(filteredAssignments)

        // Filter class recordings by enrollment - handle wrapped response
        let recordingsList = []
        if (recordingsRes.data) {
          // Check if response is wrapped { records: [...], meta }
          recordingsList = Array.isArray(recordingsRes.data.records) 
            ? recordingsRes.data.records 
            : Array.isArray(recordingsRes.data) 
              ? recordingsRes.data 
              : []
        }
        const filteredRecordings = recordingsList.filter((recording) => {
          if (recording.courseId && enrolledCourseIds.has(recording.courseId)) return true
          if (recording.sectionId && enrolledSectionIds.has(recording.sectionId)) return true
          return false
        })
        setClassRecordings(filteredRecordings)

        // Filter events - institution type shown to all, course/section types filtered by enrollment
        let eventsList = Array.isArray(eventsRes.data) ? eventsRes.data : []
        
        // Handle wrapped response structure (sometimes data is wrapped in { data: [...] })
        if (eventsList.length === 0 && eventsRes.data && eventsRes.data.data) {
          eventsList = eventsRes.data.data
        }

        const filteredEvents = eventsList.filter((event) => {
          if (event.type === 'institution') return true
          if (event.type === 'course' && event.courseId && enrolledCourseIds.has(event.courseId))
            return true
          if (event.type === 'section' && event.sectionId && enrolledSectionIds.has(event.sectionId))
            return true
          return false
        })

        setEvents(filteredEvents)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setCourses([])
        setAssignments([])
        setClassRecordings([])
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  const DashboardSection = ({ title, icon, items, viewAllLink, emptyMessage = 'No items yet' }) => (
    <div className=" rounded-xl shadow-sm border bg-slate-200 border-gray-100 p-5">
      <div className="flex items-center border-[#ffffff] border-b-2 gap-2 mb-4">
        <span className="text-2xl mb-2">{icon}</span>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : items && Array.isArray(items) && items.length > 0 ? (
        <>
          <div className="space-y-3 mb-4">
            {items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-start bg-[#f3f4f6]  justify-between gap-3 p-2 hover:bg-white rounded transition">
                <div className="flex-1  min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.subtitle}</p>
                  )}
                </div>
                {item.badge && (
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Link
            to={viewAllLink}
            className="text-black text-sm border p-3 rounded-md font-medium hover:bg-white hover:text-brand-800 transition"
          >
            View all →
          </Link>
        </>
      ) : (
        <p className="text-sm text-gray-500 py-8 text-center">{emptyMessage}</p>
      )}
    </div>
  )

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return `${dateStr} at ${timeStr}`
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Welcome <span className="text-brand-700">{name}</span>
        </h1>
        <p className="text-gray-500 mt-1">Here's your student dashboard</p>
      </div>

      {/* 4-Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <DashboardSection
          title="My Courses"
          icon="📚"
          items={(courses || []).map((c) => ({
            title: c?.course?.title || 'Untitled Course',
            subtitle: c?.course?.description || 'No description',
          }))}
          viewAllLink="/student/courses"
        />

        <DashboardSection
          title="Assignments"
          icon="📋"
          items={(assignments || []).map((a) => ({
            title: `${courseMap[a?.courseId] || a?.course?.title || 'Unknown'} > ${a?.title || 'Untitled'}`,
            subtitle: `Due: ${formatDate(a?.dueDate)}`,
          }))}
          viewAllLink="/student/assignments"
        />

        <DashboardSection
          title="Class Recordings"
          icon="🎬"
          items={(classRecordings || []).map((r) => ({
            title: r?.title || 'Untitled Recording',
            subtitle: r?.description,
          }))}
          viewAllLink="/student/class-recordings"
        />

        <DashboardSection
          title="Events Calendar"
          icon="📅"
          items={(events || []).map((e) => ({
            title: e?.title || 'Untitled Event',
            subtitle: formatDateTime(e?.startTime),
          }))}
          viewAllLink="/student/events"
        />
      </div>

      {/* Profile completion prompt */}
      {!profile?.phone && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 md:flex items-center justify-between md:gap-2">
          <div className="mb-4 md:mb-0">
            <p className="font-semibold text-brand-700">Complete your profile</p>
            <p className="text-sm text-brand-600 mt-0.5">
              Add your phone, address and other details to your profile.
            </p>
          </div>
          <Link to="/student/profile" className="btn-primary text-sm whitespace-nowrap">
            Update Profile →
          </Link>
        </div>
      )}
    </div>
  )
}
