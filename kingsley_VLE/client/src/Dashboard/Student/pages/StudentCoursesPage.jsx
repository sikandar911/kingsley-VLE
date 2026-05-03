import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { enrollmentsApi } from '../../../features/enrollments/api/enrollments.api'

const formatSchedule = (course) => {
  if (!course.daysOfWeek) return null;
  
  // Already comes as comma-separated string (e.g., "Monday, Wednesday, Friday")
  let schedule = course.daysOfWeek;
  
  if (course.startTime && course.endTime) {
    schedule += ` ${course.startTime}-${course.endTime}`;
  } else if (course.startTime) {
    schedule += ` ${course.startTime}`;
  } else if (course.endTime) {
    schedule += ` (ends ${course.endTime})`;
  }
  
  return schedule;
};

export default function StudentCoursesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStudentCourses = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!user?.id) {
          setError('User information not available')
          setLoading(false)
          return
        }

        // Fetch enrolled courses for this student using user UUID
        const enrollmentsResponse = await enrollmentsApi.listByUser(user.id)
        const enrollments = enrollmentsResponse.data

        // Extract course data from enrollments
        if (enrollments && Array.isArray(enrollments)) {
          const coursesData = enrollments.map((enrollment) => ({
            id: enrollment.course?.id,
            title: enrollment.course?.title,
            description: enrollment.course?.description,
            enrolledAt: enrollment.enrolledAt,
            section: enrollment.section?.name,
            // add kora holo section id:
            sectionId: enrollment.section?.id || null,
            daysOfWeek: enrollment.section?.daysOfWeek,
            startTime: enrollment.section?.startTime,
            endTime: enrollment.section?.endTime,
            semester: `${enrollment.semester?.name} ${enrollment.semester?.year}`,
          }))
          setCourses(coursesData)
        }
      } catch (err) {
        console.error('Error fetching student courses:', err)
        setError(
          err.response?.data?.error ||
            'Failed to load courses. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchStudentCourses()
  }, [user])

  // console.log('Enrolled courses:', courses);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 sm:h-10 bg-gray-300 rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow h-48 sm:h-56"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
            My Courses
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {user?.studentProfile?.fullName || user?.email} • Student Portal
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* No Courses Message */}
        {courses.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 lg:p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747 0-6.002-4.5-10.747-10-10.747z"
                />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No Courses Enrolled
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              You haven't enrolled in any courses yet. Please check back soon or
              contact the administrator.
            </p>
          </div>
        )}

        {/* Courses Grid */}
        {courses.length > 0 && (
          <div>
            {/* Course Count Badge */}
            <div className="mb-4 sm:mb-6">
              <span className="inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-[#6b1d3e] text-white">
                {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}{' '}
                Enrolled
              </span>
            </div>

            {/* Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-lg shadow-sm border-t-2 border-b-2 border-[#6b1d3e] hover:shadow-md transition-shadow duration-300 overflow-hidden p-5 sm:p-6 flex flex-col h-full min-h-65"
                >
                  {/* Course Header */}
                  <div className="mb-4 sm:mb-5">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 leading-snug">
                          {course.title}
                        </h3>
                      </div>
                    </div>
                    {course.description && (
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>

                  {/* Course Details */}
                  <div className="space-y-2 sm:space-y-3 pb-4 sm:pb-5 border-b border-[#6b1d3e] flex-grow">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium">{course.section || '—'}</span>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{course.semester || '—'}</span>
                    </div>
                    {formatSchedule(course) && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium">{formatSchedule(course)}</span>
                      </div>
                    )}
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Enrolled:{' '}
                        {new Date(course.enrolledAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {/* `/teacher/courses/${course.id}${course.sectionId ? `?sectionId=${course.sectionId}` : ""}` */}
                  <div className="pt-4 sm:pt-5 space-y-2">
                    <button
                      onClick={() => navigate(`/student/courses/${course.id}${course.sectionId ? `?sectionId=${course.sectionId}` : ""}`)}
                      style={{ backgroundColor: '#6b1d3e' }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg hover:shadow-md transition-all duration-300 hover:opacity-90"
                    >
                      View Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
