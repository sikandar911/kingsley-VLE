import { useState, useEffect, useCallback } from 'react'
import { academicApi } from '../api/academic.api'
import SessionFormModal from '../components/SessionFormModal'
import SemesterFormModal from '../components/SemesterFormModal'

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function AdminAcademicPage() {
  const [tab, setTab] = useState('sessions')

  // ── Sessions state ──
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [deleteSessionId, setDeleteSessionId] = useState(null)
  const [deleteSessionLoading, setDeleteSessionLoading] = useState(false)

  // ── Semesters state ──
  const [semesters, setSemesters] = useState([])
  const [semestersLoading, setSemestersLoading] = useState(true)
  const [showSemesterModal, setShowSemesterModal] = useState(false)
  const [editSemester, setEditSemester] = useState(null)
  const [deleteSemesterId, setDeleteSemesterId] = useState(null)
  const [deleteSemesterLoading, setDeleteSemesterLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const res = await academicApi.sessions.list()
      setSessions(res.data || [])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  const fetchSemesters = useCallback(async () => {
    setSemestersLoading(true)
    try {
      const res = await academicApi.semesters.list()
      setSemesters(res.data || [])
    } finally {
      setSemestersLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])
  useEffect(() => { fetchSemesters() }, [fetchSemesters])

  const deleteSession = async (id) => {
    setDeleteSessionLoading(true)
    try {
      await academicApi.sessions.delete(id)
      setDeleteSessionId(null)
      fetchSessions()
    } finally {
      setDeleteSessionLoading(false)
    }
  }

  const deleteSemester = async (id) => {
    setDeleteSemesterLoading(true)
    try {
      await academicApi.semesters.delete(id)
      setDeleteSemesterId(null)
      fetchSemesters()
    } finally {
      setDeleteSemesterLoading(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic Structure</h1>
          <p className="page-subtitle">Manage sessions and semesters</p>
        </div>
        {tab === 'sessions' ? (
          <button className="btn-primary" onClick={() => { setEditSession(null); setShowSessionModal(true) }}>
            + Add Session
          </button>
        ) : (
          <button className="btn-primary" onClick={() => { setEditSemester(null); setShowSemesterModal(true) }}>
            + Add Semester
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">📅</div>
          <div>
            <p className="stat-label">Total Sessions</p>
            <p className="stat-value">{sessions.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">🗓️</div>
          <div>
            <p className="stat-label">Total Semesters</p>
            <p className="stat-value">{semesters.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="panel">
        <div className="panel-header">
          <div className="tab-group">
            <button
              className={`tab-btn ${tab === 'sessions' ? 'tab-btn--active' : ''}`}
              onClick={() => setTab('sessions')}
            >
              📅 Sessions
            </button>
            <button
              className={`tab-btn ${tab === 'semesters' ? 'tab-btn--active' : ''}`}
              onClick={() => setTab('semesters')}
            >
              🗓️ Semesters
            </button>
          </div>
        </div>

        {/* Sessions Tab */}
        {tab === 'sessions' && (
          sessionsLoading ? (
            <div className="panel-loading"><div className="spinner" /></div>
          ) : sessions.length === 0 ? (
            <p className="table-empty">No sessions yet. Create a session to get started.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session Name</th>
                    <th>Description</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Semesters</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="td-name">{s.name}</td>
                      <td className="text-gray-500 max-w-xs truncate">
                        {s.description || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-gray-500">{formatDate(s.startDate)}</td>
                      <td className="text-gray-500">{formatDate(s.endDate)}</td>
                      <td>
                        <span className="badge badge-id">{s.semesters?.length ?? 0}</span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            onClick={() => { setEditSession(s); setShowSessionModal(true) }}
                            className="btn-icon text-blue-600 hover:bg-blue-50"
                          >✏️</button>
                          <button
                            onClick={() => setDeleteSessionId(s.id)}
                            className="btn-icon text-red-500 hover:bg-red-50"
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Semesters Tab */}
        {tab === 'semesters' && (
          semestersLoading ? (
            <div className="panel-loading"><div className="spinner" /></div>
          ) : semesters.length === 0 ? (
            <p className="table-empty">No semesters yet. Create a session first, then add semesters.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Semester Name</th>
                    <th>Session</th>
                    <th>Year</th>
                    <th>Months</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((sem) => (
                    <tr key={sem.id}>
                      <td className="td-name">{sem.name}</td>
                      <td className="text-gray-700">
                        {sem.session?.name || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-gray-500">{sem.year || <span className="text-gray-300">—</span>}</td>
                      <td className="text-gray-500">
                        {sem.monthsIncluded || <span className="text-gray-300">—</span>}
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            onClick={() => { setEditSemester(sem); setShowSemesterModal(true) }}
                            className="btn-icon text-blue-600 hover:bg-blue-50"
                          >✏️</button>
                          <button
                            onClick={() => setDeleteSemesterId(sem.id)}
                            className="btn-icon text-red-500 hover:bg-red-50"
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Session modal */}
      {showSessionModal && (
        <SessionFormModal
          editSession={editSession}
          onClose={() => { setShowSessionModal(false); setEditSession(null) }}
          onSaved={() => { setShowSessionModal(false); setEditSession(null); fetchSessions() }}
        />
      )}

      {/* Semester modal */}
      {showSemesterModal && (
        <SemesterFormModal
          editSemester={editSemester}
          onClose={() => { setShowSemesterModal(false); setEditSemester(null) }}
          onSaved={() => { setShowSemesterModal(false); setEditSemester(null); fetchSemesters() }}
        />
      )}

      {/* Delete session confirm */}
      {deleteSessionId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Delete Session?</h3>
              <p className="text-sm text-gray-600">
                This will delete the session and all its semesters. This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteSessionId(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={() => deleteSession(deleteSessionId)}
                  disabled={deleteSessionLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteSessionLoading ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete semester confirm */}
      {deleteSemesterId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Delete Semester?</h3>
              <p className="text-sm text-gray-600">
                This will delete the semester. Sections and enrollments linked to it will be affected.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteSemesterId(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={() => deleteSemester(deleteSemesterId)}
                  disabled={deleteSemesterLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteSemesterLoading ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
