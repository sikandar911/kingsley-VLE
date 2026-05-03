import { useState, useEffect, useCallback } from "react";
import { academicApi } from "../api/academic.api";
import SessionFormModal from "../components/SessionFormModal";
import SemesterFormModal from "../components/SemesterFormModal";

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function AdminAcademicPage() {
  const [tab, setTab] = useState("sessions");

  // ── Sessions state ──
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [deleteSessionLoading, setDeleteSessionLoading] = useState(false);

  // ── Semesters state ──
  const [semesters, setSemesters] = useState([]);
  const [semestersLoading, setSemestersLoading] = useState(true);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [editSemester, setEditSemester] = useState(null);
  const [deleteSemesterId, setDeleteSemesterId] = useState(null);
  const [deleteSemesterLoading, setDeleteSemesterLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await academicApi.sessions.list();
      setSessions(res.data || []);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const fetchSemesters = useCallback(async () => {
    setSemestersLoading(true);
    try {
      const res = await academicApi.semesters.list();
      setSemesters(res.data || []);
    } finally {
      setSemestersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const deleteSession = async (id) => {
    setDeleteSessionLoading(true);
    try {
      await academicApi.sessions.delete(id);
      setDeleteSessionId(null);
      fetchSessions();
    } finally {
      setDeleteSessionLoading(false);
    }
  };

  const deleteSemester = async (id) => {
    setDeleteSemesterLoading(true);
    try {
      await academicApi.semesters.delete(id);
      setDeleteSemesterId(null);
      fetchSemesters();
    } finally {
      setDeleteSemesterLoading(false);
    }
  };

  return (
    <div className="md:page-container px-4 py-4 md:px-4 lg:px-8  lg:py-8">
      {/* Header */}
      <div className="md:page-header ">
        <div>
          <h1 className="page-title">Academic Structure</h1>
          <p className="page-subtitle">Manage sessions and semesters</p>
        </div>
        {tab === "sessions" ? (
          <button
            className="btn-primary mt-2 lg:mt-0"
            onClick={() => {
              setEditSession(null);
              setShowSessionModal(true);
            }}
          >
            + Add Session
          </button>
        ) : (
          <button
            className="btn-primary mt-2 lg:mt-0"
            onClick={() => {
              setEditSemester(null);
              setShowSemesterModal(true);
            }}
          >
            + Add Semester
          </button>
        )}
      </div>

      {/* Stats div*/}
      <div className=" py-4 md:py-0 grid grid-cols-2 sm:grid-cols-2 gap-4 md:mb-8">
        <div className="stat-card flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
          <div className="stat-icon bg-orange-50">
            <img
              src="/sessions-icon.png"
              alt="Total Sessions"
              className="w-8 h-8 sm:w-9 sm:h-9"
            />
          </div>
          <div>
            <p className="stat-label">Total Sessions</p>
            <p className="stat-value">{sessions.length}</p>
          </div>
        </div>
        <div className="stat-card flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
          <div className="stat-icon bg-orange-50">
            <img
              src="/semester-icon.png"
              alt="Total Semesters"
              className="w-8 h-8 sm:w-9 sm:h-9"
            />
          </div>
          <div>
            <p className="stat-label">Total Semesters</p>
            <p className="stat-value">{semesters.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs div*/}
      <div className="panel ">
        <div className="panel-header">
          <div className="tab-group">
            <button
              className={`tab-btn ${tab === "sessions" ? "tab-btn--active" : ""}`}
              onClick={() => setTab("sessions")}
            >
              <img
                src="/total-session-icon.png"
                alt="Sessions"
                className="w-5 h-5 inline mr-2"
              />
              Sessions
            </button>
            <button
              className={`tab-btn ${tab === "semesters" ? "tab-btn--active" : ""}`}
              onClick={() => setTab("semesters")}
            >
              <img
                src="/total-semester-icon.png"
                alt="Semesters"
                className="w-5 h-5 inline mr-2"
              />
              Semesters
            </button>
          </div>
        </div>

        {/* Sessions Tab */}
        {tab === "sessions" &&
          (sessionsLoading ? (
            <div className="panel-loading">
              <div className="spinner" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="table-empty">
              No sessions yet. Create a session to get started.
            </p>
          ) : (
            <div className="table-wrapper ">
              <table className="data-table ">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Session Name</th>
                    <th className="whitespace-nowrap">Description</th>
                    <th className="whitespace-nowrap">Start Date</th>
                    <th className="whitespace-nowrap">End Date</th>
                    <th className="whitespace-nowrap">Semesters</th>
                    <th className="whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="td-name whitespace-nowrap">{s.name}</td>
                      <td className="text-gray-500 max-w-xs truncate whitespace-nowrap">
                        {s.description || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {formatDate(s.startDate)}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {formatDate(s.endDate)}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="badge badge-id">
                          {s.semesters?.length ?? 0}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            onClick={() => {
                              setEditSession(s);
                              setShowSessionModal(true);
                            }}
                            className="btn-icon hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#6b1d3e"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteSessionId(s.id)}
                            className="btn-icon hover:bg-red-50"
                            title="Delete"
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#6b1d3e"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* Semesters Tab */}
        {tab === "semesters" &&
          (semestersLoading ? (
            <div className="panel-loading">
              <div className="spinner" />
            </div>
          ) : semesters.length === 0 ? (
            <p className="table-empty">
              No semesters yet. Create a session first, then add semesters.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Semester Name</th>
                    <th className="whitespace-nowrap">Session</th>
                    <th className="whitespace-nowrap">Year</th>
                    <th className="whitespace-nowrap">Months</th>
                    <th className="whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((sem) => (
                    <tr key={sem.id}>
                      <td className="td-name whitespace-nowrap">{sem.name}</td>
                      <td className="text-gray-700 whitespace-nowrap">
                        {sem.session?.name || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {sem.year || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="text-gray-500 whitespace-nowrap">
                        {sem.monthsIncluded || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            onClick={() => {
                              setEditSemester(sem);
                              setShowSemesterModal(true);
                            }}
                            className="btn-icon hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#6b1d3e"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteSemesterId(sem.id)}
                            className="btn-icon hover:bg-red-50"
                            title="Delete"
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#6b1d3e"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      {/* Session modal */}
      {showSessionModal && (
        <SessionFormModal
          editSession={editSession}
          onClose={() => {
            setShowSessionModal(false);
            setEditSession(null);
          }}
          onSaved={() => {
            setShowSessionModal(false);
            setEditSession(null);
            fetchSessions();
          }}
        />
      )}

      {/* Semester modal */}
      {showSemesterModal && (
        <SemesterFormModal
          editSemester={editSemester}
          onClose={() => {
            setShowSemesterModal(false);
            setEditSemester(null);
          }}
          onSaved={() => {
            setShowSemesterModal(false);
            setEditSemester(null);
            fetchSemesters();
          }}
        />
      )}

      {/* Delete session confirm */}
      {deleteSessionId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <div className="px-6 py-5 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Delete Session?
              </h3>
              <p className="text-sm text-gray-600">
                This will delete the session and all its semesters. This cannot
                be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteSessionId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteSession(deleteSessionId)}
                  disabled={deleteSessionLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteSessionLoading ? "Deleting…" : "Delete"}
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
              <h3 className="text-lg font-bold text-gray-900">
                Delete Semester?
              </h3>
              <p className="text-sm text-gray-600">
                This will delete the semester. Sections and enrollments linked
                to it will be affected.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteSemesterId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteSemester(deleteSemesterId)}
                  disabled={deleteSemesterLoading}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                >
                  {deleteSemesterLoading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
