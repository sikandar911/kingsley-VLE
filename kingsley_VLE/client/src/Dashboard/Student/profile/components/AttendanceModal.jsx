import { useEffect, useState } from 'react'
import api from '../../../../lib/api'

const STATUS_STYLE = {
  present: 'bg-green-100 text-green-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-yellow-100 text-yellow-700',
}

export default function AttendanceModal({ courseId, sectionId, studentId, studentName, onClose }) {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(null)

  useEffect(() => {
    if (!courseId || !sectionId) return

    let cancelled = false

    const fetch = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch records for this course and section, then filter client-side for the student
        const res = await api.get('/attendance', {
          params: { courseId, sectionId, limit: 500 },
        })

        if (cancelled) return

        const all  = Array.isArray(res.data?.records) ? res.data.records : []
        const mine = all
          .filter((r) => r.studentId === studentId)
          .sort((a, b) => new Date(b.date) - new Date(a.date))

        setRecords(mine)
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.error || 'Failed to load attendance records.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [courseId, sectionId, studentId])

  // ── Summary stats ──────────────────────────────────────────────────────────
  const total   = records.length
  const present = records.filter((r) => r.status === 'present').length
  const absent  = records.filter((r) => r.status === 'absent').length
  const late    = records.filter((r) => r.status === 'late').length
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0
  const rateOk  = rate >= 75

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Attendance Record</h3>
            <p className="text-xs text-gray-500 mt-0.5">{studentName}</p>
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
          <div className="flex-1 flex items-center justify-center p-10">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: '#6b1d3e' }}
            />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : (
          <>
            {/* ── Summary numbers ── */}
            <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-gray-100">
              {[
                { label: 'Total',   value: total,   color: 'text-gray-900' },
                { label: 'Present', value: present, color: 'text-green-600' },
                { label: 'Absent',  value: absent,  color: 'text-red-600'   },
                { label: 'Late',    value: late,     color: 'text-yellow-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Attendance rate bar ── */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Attendance Rate</span>
                <span className="font-semibold text-gray-900">
                  {rate}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${rate}%`,
                    backgroundColor: '#6b1d3e',
                  }}
                />
              </div>
            </div>

            {/* ── Records table ── */}
            <div className="overflow-y-auto flex-1">
              {records.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No attendance records found for this section.
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Semester
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-3 text-gray-800">
                          {new Date(r.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day:   'numeric',
                            year:  'numeric',
                          })}
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-xs">
                          {r.semester?.name} {r.semester?.year}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status] ?? 'bg-gray-100 text-gray-500'}`}
                          >
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            style={{ backgroundColor: '#6b1d3e' }}
            className="w-full px-4 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
