import { useEffect, useState, useCallback } from 'react'
import { assignmentsApi } from '../../../../features/assignments/api/assignments.api'
import { enrollmentsApi } from '../../../../features/enrollments/api/enrollments.api'
import TeacherAttendanceSummaryModal from './TeacherAttendanceSummaryModal'

// ── Helpers ──────────────────────────────────────────────────────────────────

function gradeStyle(grade) {
  if (!grade) return 'bg-gray-100 text-gray-400'
  switch (grade?.toUpperCase?.()) {
    case 'A+': return 'bg-green-100 text-green-700'
    case 'A': return 'bg-green-100 text-green-700'
    case 'B': return 'bg-blue-100 text-blue-700'
    case 'C': return 'bg-yellow-100 text-yellow-700'
    case 'D': return 'bg-orange-100 text-orange-700'
    case 'F': return 'bg-red-100 text-red-700'
    default:  return 'bg-gray-100 text-gray-400'
  }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ submission }) {
  if (!submission) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
        Not Submitted
      </span>
    )
  }
  if (submission.marks != null) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
        Graded
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
      Submitted
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TeacherGradePerformanceTab({
  courseId,
  sectionId,
  semesterId,
  teacher,
  course,
  section,
}) {
  const [assignments, setAssignments]   = useState([])
  const [students,    setStudents]      = useState([])
  // submissionsMap: { [assignmentId]: [submission, ...] }
  const [submissionsMap, setSubmissionsMap] = useState({})
  const [loading,     setLoading]       = useState(true)
  const [error,       setError]         = useState(null)
  const [loadingSubs, setLoadingSubs]   = useState(false)
  const [showAttendance, setShowAttendance] = useState(false)

  // ── Fetch students (enrollments) and assignments in parallel ──────────────
  const loadData = useCallback(async () => {
    if (!courseId) return

    try {
      setLoading(true)
      setError(null)

      const params = { courseId }
      if (sectionId)  params.sectionId  = sectionId
      if (semesterId) params.semesterId = semesterId

      const [assignRes, enrollRes] = await Promise.all([
        assignmentsApi.list({ courseId }),
        enrollmentsApi.list(params),
      ])

      // ── Assignments filtered to this section ──
      const allAssignments = Array.isArray(assignRes.data) ? assignRes.data : []
      const filtered = allAssignments.filter((a) => {
        if (sectionId && a.sectionId === sectionId) return true
        if (!sectionId && a.courseId === courseId)  return true
        return false
      })
      setAssignments(filtered)

      // ── Students from enrollments ──
      const enrollList = Array.isArray(enrollRes.data) ? enrollRes.data : []
      const studentsList = enrollList.map((e) => ({
        id:        e.studentId || e.student?.id,
        studentId: e.student?.studentId,
        fullName:  e.student?.fullName || 'Unknown',
      }))
      setStudents(studentsList)

      // ── Fetch submissions for each assignment ──
      if (filtered.length > 0) {
        setLoadingSubs(true)
        const subResults = await Promise.all(
          filtered.map((a) =>
            assignmentsApi
              .getSubmissions(a.id)
              .then((r) => ({ id: a.id, subs: Array.isArray(r.data) ? r.data : [] }))
              .catch(() => ({ id: a.id, subs: [] }))
          )
        )
        const map = {}
        subResults.forEach(({ id, subs }) => { map[id] = subs })
        setSubmissionsMap(map)
        setLoadingSubs(false)
      }
    } catch (err) {
      console.error('TeacherGradePerformanceTab error:', err)
      setError(err.response?.data?.error || err.message || 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [courseId, sectionId, semesterId])

  useEffect(() => { loadData() }, [loadData])

  // ── Group assignments by courseModule ────────────────────────────────────
  const moduleMap = new Map()
  assignments.forEach((a) => {
    const mod  = a.courseModule
    const key  = mod?.id || '__none__'
    const name = mod?.name || null
    if (!moduleMap.has(key)) moduleMap.set(key, { key, name, assignments: [] })
    moduleMap.get(key).assignments.push(a)
  })
  const modules = [...moduleMap.values()]

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm h-40" />
        ))}
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {/* Left: Course + Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {course?.title || 'Course'}
            </h2>
            {section?.name && (
              <p className="text-sm text-gray-500 mt-0.5">
                Section: <span className="font-medium text-gray-700">{section.name}</span>
              </p>
            )}
          </div>

          {/* Right: Teacher info + Attendance button */}
          <div className="flex flex-col items-end gap-2">
            {teacher && (
              <div className="text-sm text-right">
                <p className="font-bold text-gray-900">{teacher.fullName}</p>
                {teacher.specialization && (
                  <p className="text-gray-500">{teacher.specialization}</p>
                )}
              </div>
            )}
            <button
              onClick={() => setShowAttendance(true)}
              style={{ backgroundColor: '#6b1d3e' }}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition"
            >
              View Attendance Summary
            </button>
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {modules.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500 text-sm">No assignments found for this course.</p>
        </div>
      )}

      {/* ── Module sections ── */}
      {modules.map(({ key, name: moduleName, assignments: modAssignments }) => (
        <div key={key} className="space-y-4">

          {/* Module header */}
          <div
            className="px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: 'rgba(107,29,62,0.08)' }}
          >
            <h3 className="text-sm font-bold" style={{ color: '#6b1d3e' }}>
              {moduleName ? `Module: ${moduleName}` : 'General Assignments'}
            </h3>
          </div>

          {/* One table per assignment */}
          {modAssignments.map((assignment) => {
            const subs        = submissionsMap[assignment.id] || []
            // Build a lookup: studentProfileId → submission
            const subByStudent = {}
            subs.forEach((s) => {
              subByStudent[s.studentId] = s
            })

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Assignment title header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-800">
                      {assignment.title}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Total: {assignment.totalMarks ?? '—'} marks
                    </span>
                    {loadingSubs && (
                      <span className="text-xs text-blue-400 animate-pulse">Loading submissions…</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    Due: {formatDate(assignment.dueDate)}
                  </span>
                </div>

                {/* Student rows */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Student
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Marks Gained / Total
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Grade
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Marked At
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Marked By
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-4 text-center text-xs text-gray-400">
                            No students enrolled in this section.
                          </td>
                        </tr>
                      ) : (
                        students.map((student) => {
                          const sub   = subByStudent[student.id]
                          const marks = sub?.marks ?? null
                          const grade = sub?.gradeLetter ?? null
                          const markedAt = sub?.markedAt || null
                          const markedBy = sub?.markedByTeacher?.fullName || null

                          return (
                            <tr key={student.id} className="hover:bg-gray-50/50 transition">
                              {/* Student name + ID */}
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-gray-900">{student.fullName}</p>
                                {student.studentId && (
                                  <p className="text-xs text-gray-400 mt-0.5">{student.studentId}</p>
                                )}
                              </td>

                              {/* Marks */}
                              <td className="px-4 py-3.5 text-center text-gray-700">
                                {marks != null
                                  ? `${marks} / ${assignment.totalMarks ?? '—'}`
                                  : '— / ' + (assignment.totalMarks ?? '—')}
                              </td>

                              {/* Grade */}
                              <td className="px-4 py-3.5 text-center">
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${gradeStyle(grade)}`}
                                >
                                  {grade ?? '—'}
                                </span>
                              </td>

                              {/* Marked At */}
                              <td className="px-4 py-3.5 text-center text-xs text-gray-500">
                                {sub?.markedAt ? formatDate(markedAt) : '—'}
                              </td>

                              {/* Marked By */}
                              <td className="px-4 py-3.5 text-center text-xs text-gray-600">
                                {markedBy || '—'}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3.5 text-center">
                                <StatusBadge submission={sub} />
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ))}
      {/* ── Attendance Summary Modal ── */}
      {showAttendance && (
        <TeacherAttendanceSummaryModal
          courseId={courseId}
          sectionId={sectionId}
          courseName={course?.title}
          sectionName={section?.name}
          onClose={() => setShowAttendance(false)}
        />
      )}
    </div>
  )
}
