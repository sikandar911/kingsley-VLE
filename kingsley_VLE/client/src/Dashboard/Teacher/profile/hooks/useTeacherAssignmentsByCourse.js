import { useEffect, useState } from 'react'
import { assignmentsApi } from '../../../../features/assignments/api/assignments.api'

const ITEMS_PER_PAGE = 15

export const useTeacherAssignmentsByCourse = (courseId, sectionId, currentPage = 1) => {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!courseId) {
          setAssignments([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        const res = await assignmentsApi.list({ courseId })
        const all = Array.isArray(res.data) ? res.data : []

        // Filter to only assignments for this course/section
        const filtered = all.filter((a) => {
          if (courseId && a.courseId === courseId) return true
          if (sectionId && a.sectionId === sectionId) return true
          return false
        })

        setTotalCount(filtered.length)
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
        const endIdx = startIdx + ITEMS_PER_PAGE
        setAssignments(filtered.slice(startIdx, endIdx))
      } catch (err) {
        setError(
          err.response?.data?.error ||
            err.message ||
            'Failed to load assignments'
        )
        setAssignments([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [courseId, sectionId, currentPage])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return {
    assignments,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
  }
}
