import { useEffect, useState } from 'react'
import { classRecordsApi } from '../../../../features/classRecords/api/classRecords.api'

const ITEMS_PER_PAGE = 15

export const useRecordingsByCourse = (courseId, sectionId, currentPage = 1) => {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!courseId) {
          setRecords([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        const res = await classRecordsApi.list({ courseId })
        console.log('[useRecordingsByCourse] API Response:', res)

        // Handle both wrapped and direct response
        let all = []
        if (res.data) {
          // Check different response structures
          if (Array.isArray(res.data)) {
            all = res.data
          } else if (Array.isArray(res.data.records)) {
            all = res.data.records
          } else if (res.data.data && Array.isArray(res.data.data)) {
            all = res.data.data
          }
        }
        console.log('[useRecordingsByCourse] Total recordings fetched:', all.length)

        // Filter to only records belonging to this course/section
        const filtered = all.filter((r) => {
          if (courseId && r.courseId === courseId) return true
          if (sectionId && r.sectionId === sectionId) return true
          return false
        })
        console.log('[useRecordingsByCourse] Filtered recordings:', filtered.length)

        // Set total count and paginate
        setTotalCount(filtered.length)
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
        const endIdx = startIdx + ITEMS_PER_PAGE
        const paginatedRecords = filtered.slice(startIdx, endIdx)
        setRecords(paginatedRecords)
      } catch (err) {
        console.error('Error loading class recordings:', err)
        setError(
          err.response?.data?.error ||
            err.message ||
            'Failed to load recordings'
        )
        setRecords([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [courseId, sectionId, currentPage])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return { 
    records, 
    loading, 
    error,
    totalCount,
    totalPages,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
  }
}
