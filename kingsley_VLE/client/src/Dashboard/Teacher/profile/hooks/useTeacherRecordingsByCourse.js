import { useEffect, useState } from 'react'
import { classRecordsApi } from '../../../../features/classRecords/api/classRecords.api'

const ITEMS_PER_PAGE = 15

export const useTeacherRecordingsByCourse = (courseId, sectionId, currentPage = 1, refetchTrigger = 0) => {
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

        let all = []
        if (res.data) {
          if (Array.isArray(res.data)) {
            all = res.data
          } else if (Array.isArray(res.data.records)) {
            all = res.data.records
          } else if (res.data.data && Array.isArray(res.data.data)) {
            all = res.data.data
          }
        }

        const filtered = all.filter((r) => {
          if (courseId && r.courseId === courseId) return true
          if (sectionId && r.sectionId === sectionId) return true
          return false
        })

        setTotalCount(filtered.length)
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
        setRecords(filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE))
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load recordings')
        setRecords([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [courseId, sectionId, currentPage, refetchTrigger])

  return {
    records,
    loading,
    error,
    totalCount,
    totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
  }
}
