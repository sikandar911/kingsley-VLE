import { useState } from 'react'
import { useMaterialsByCourse, useRecordingsByCourse } from '../hooks'
import { fmt } from '../utils/helpers'

export default function MaterialsTab({ courseId, sectionId }) {
  const [activeSwitch, setActiveSwitch] = useState('materials')
  const [materialsPage, setMaterialsPage] = useState(1)
  const [recordsPage, setRecordsPage] = useState(1)

  const {
    materials,
    loading: matLoading,
    error: matError,
    totalPages: matTotalPages,
    totalCount: matTotalCount,
  } = useMaterialsByCourse(courseId, sectionId, materialsPage)

  const {
    records,
    loading: recLoading,
    error: recError,
    totalPages: recTotalPages,
    totalCount: recTotalCount,
  } = useRecordingsByCourse(courseId, sectionId, recordsPage)

  const loading = matLoading || recLoading
  const error = matError || recError

  const list = activeSwitch === 'materials' ? materials : records
  const totalPages = activeSwitch === 'materials' ? matTotalPages : recTotalPages
  const totalCount = activeSwitch === 'materials' ? matTotalCount : recTotalCount
  const currentPage = activeSwitch === 'materials' ? materialsPage : recordsPage
  const setCurrentPage = activeSwitch === 'materials' ? setMaterialsPage : setRecordsPage

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex gap-2 mb-4">
          <div className="h-10 bg-gray-200 rounded-lg w-36" />
          <div className="h-10 bg-gray-200 rounded-lg w-36" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveSwitch('materials')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeSwitch === 'materials'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Class Materials
        </button>
        <button
          onClick={() => setActiveSwitch('records')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeSwitch === 'records'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Class Records
        </button>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">
            {activeSwitch === 'materials' ? '📁' : '🎬'}
          </div>
          <p className="text-gray-500 text-sm">
            No {activeSwitch === 'materials' ? 'class materials' : 'class recordings'} for this
            course yet.
          </p>
        </div>
      )}

      {/* Material cards */}
      {activeSwitch === 'materials' && materials.length > 0 && (
        <div className="space-y-3">
          {materials.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                    {m.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{m.uploadedAt ? fmt(m.uploadedAt) : ''}</p>
                  </div>
                  {m.fileUrl && (
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: '#6b1d3e' }}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recordings cards */}
      {activeSwitch === 'records' && records.length > 0 && (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    )}
                    {r.recordedAt && (
                      <p className="text-xs text-gray-400 mt-1">Recorded: {fmt(r.recordedAt)}</p>
                    )}
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: '#6b1d3e' }}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition"
                    >
                      Watch
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * 15 + 1} to {Math.min(currentPage * 15, totalCount)} of{' '}
            {totalCount} {activeSwitch === 'materials' ? 'materials' : 'recordings'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    currentPage === page
                      ? 'bg-[#6b1d3e] text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
