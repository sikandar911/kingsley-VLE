import { useEffect, useState } from 'react'
import api from '../../../../lib/api'

export default function TeacherAttendanceSummaryModal({ courseId, sectionId, courseName, sectionName, onClose }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!sectionId) return

    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = { sectionId, limit: 2000 }
        if (courseId) params.courseId = courseId

        const res = await api.get('/attendance', { params })
        if (cancelled) return

        const records = Array.isArray(res.data?.records) ? res.data.records : []

        // Aggregate per student
        const map = {}
        records.forEach((r) => {
          const sid = r.studentId
          if (!map[sid]) {
            map[sid] = {
              id:        sid,
              studentId: r.student?.studentId || '—',
              fullName:  r.student?.fullName  || 'Unknown',
              present: 0, absent: 0, late: 0, excused: 0, total: 0,
            }
          }
          map[sid].total++
          const s = r.status?.toLowerCase()
          if (s === 'present') map[sid].present++
          else if (s === 'absent')  map[sid].absent++
          else if (s === 'late')    map[sid].late++
          else if (s === 'excused') map[sid].excused++
        })

        // Sort by name
        const sorted = Object.values(map).sort((a, b) =>
          a.fullName.localeCompare(b.fullName)
        )
        setRows(sorted)
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.error || 'Failed to load attendance data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [courseId, sectionId])

  // Section totals
  const totals = rows.reduce(
    (acc, r) => {
      acc.total   += r.total
      acc.present += r.present
      acc.absent  += r.absent
      acc.late    += r.late
      acc.excused += r.excused
      return acc
    },
    { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
  )

  const percentColor = (pct) => {
    if (pct >= 75) return 'text-green-600'
    if (pct >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Attendance Summary</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {courseName || 'Course'}
              {sectionName && <span className="ml-2">• {sectionName}</span>}
              {rows.length > 0 && <span className="ml-2">• {rows.length} students</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: '#6b1d3e' }}
            />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">No attendance records found for this section.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr style={{ backgroundColor: '#6b1d3e' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-white uppercase tracking-wide">
                    Student
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide">
                    Total Classes
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide">
                    Present
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide">
                    Absent
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide">
                    Late
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide">
                    Excused
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide">
                    Present %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => {
                  const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{row.fullName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{row.studentId}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-gray-700">
                        {row.total}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                          {row.present}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                          {row.absent}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                          {row.late}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm">
                          {row.excused}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-bold ${percentColor(pct)}`}>
                            {pct}%
                          </span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* ── Totals row ── */}
                {/* <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    Section Total
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-800">{totals.total}</td>
                  <td className="px-4 py-3.5 text-center text-green-700">{totals.present}</td>
                  <td className="px-4 py-3.5 text-center text-red-700">{totals.absent}</td>
                  <td className="px-4 py-3.5 text-center text-blue-700">{totals.late}</td>
                  <td className="px-4 py-3.5 text-center text-yellow-700">{totals.excused}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-bold ${percentColor(totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0)}`}>
                      {totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0}%
                    </span>
                  </td>
                </tr> */}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
