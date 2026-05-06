import { useState } from 'react'
import { useAssignmentsByCourse } from '../hooks/useAssignmentsByCourse'
import AttendanceModal from './AttendanceModal'

// ── Grade helpers ────────────────────────────────────────────────────────────

function gradeStyle(grade) {
  if (!grade) return 'bg-gray-100 text-gray-400'
  switch (grade.toUpperCase()) {
    case 'A': return 'bg-green-100 text-green-700'
    case 'B': return 'bg-blue-100 text-blue-700'
    case 'C': return 'bg-yellow-100 text-yellow-700'
    case 'D': return 'bg-orange-100 text-orange-700'
    case 'F': return 'bg-red-100 text-red-700'
    default:  return 'bg-gray-100 text-gray-400'
  }
}

function submissionStatus(assignment) {
  const sub = assignment.submissions?.[0]
  if (!sub)          return { label: 'Not Submitted', color: 'bg-red-50 text-red-600' }
  if (sub.marks != null) return { label: 'Graded',        color: 'bg-green-50 text-green-700' }
  return               { label: 'Submitted',    color: 'bg-blue-50 text-blue-700' }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function GradePerformanceTab({ courseId, sectionId, enrollment }) {
  const [showAttendance, setShowAttendance] = useState(false)

  // Re-use the existing hook (page 1, large enough to get all for this course)
  const { assignments, loading, error } = useAssignmentsByCourse(courseId, sectionId, 1)

  const studentId   = enrollment?.studentId   || enrollment?.student?.id
  const studentName = enrollment?.student?.fullName  || 'Student'
  const studentCode = enrollment?.student?.studentId || ''

  // Group by courseModule — only include modules that actually have at least one assignment
  const moduleMap = new Map()
  assignments.forEach((a) => {
    // Check both 'courseModule' and 'module' field names
    const module = a.courseModule || a.module
    const key  = module?.id || '__none__'
    const name = module?.name || null
    if (!moduleMap.has(key)) moduleMap.set(key, { id: key, name, assignments: [] })
    moduleMap.get(key).assignments.push(a)
  })
  const modules = [...moduleMap.values()]
    .filter((m) => m.assignments.length > 0)
    .reverse()

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm h-36" />
        ))}
      </div>
    )
  }

  // ── Error ──
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Grade &amp; Performance</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {studentName}
            {studentCode && (
              <span className="ml-2 text-gray-400 font-normal">— {studentCode}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAttendance(true)}
          style={{ backgroundColor: '#6b1d3e' }}
          className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition"
        >
          View Attendance
        </button>
      </div>

      {/* ── Empty state ── */}
      {modules.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
           <img
            src="/grading-icon-profile.png"
            alt="No submissions to grade"
            className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3"
          />
          <p className="text-gray-500 text-sm">
            No assignments with grades yet.
          </p>
        </div>
      )}

      {/* ── Module tables ── */}
      {modules.map(({ name: moduleName, assignments: modAssignments }, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Module name header */}
          <div
            className="px-5 py-3 border-b border-gray-100"
            style={{ backgroundColor: 'rgba(107,29,62,0.06)' }}
          >
            <h3 className="text-sm font-bold" style={{ color: '#6b1d3e' }}>
              {moduleName || 'General Assignments'}
            </h3>
          </div>

          {/* Assignment table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Assignment Name
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total Marks
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Marks Gained
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Grade
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modAssignments.map((a) => {
                  const sub        = a.submissions?.[0]
                  const marksTotal = a.totalMarks ?? null
                  const marksGot   = sub?.marks   ?? null
                  const grade      = sub?.gradeLetter ?? null
                  const { label: statusLabel, color: statusColor } = submissionStatus(a)

                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3.5 text-gray-900 font-medium">{a.title}</td>

                      <td className="px-4 py-3.5 text-center text-gray-700">
                        {marksTotal ?? '—'}
                      </td>

                      <td className="px-4 py-3.5 text-center text-gray-700">
                        {marksGot != null ? marksGot : '—'}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${gradeStyle(grade)}`}
                        >
                          {grade ?? '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ── Attendance modal ── */}
      {showAttendance && (
        <AttendanceModal
          courseId={courseId}
          sectionId={sectionId}
          studentId={studentId}
          studentName={studentName}
          onClose={() => setShowAttendance(false)}
        />
      )}
    </div>
  )
}
