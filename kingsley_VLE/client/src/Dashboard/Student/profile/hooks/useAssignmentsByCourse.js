import { useEffect, useState } from 'react'
import { assignmentsApi } from '../../../../features/assignments/api/assignments.api'

const ITEMS_PER_PAGE = 15

export const useAssignmentsByCourse = (courseId, sectionId, currentPage = 1) => {
  const [assignments, setAssignments] = useState([])
  const [submittedIds, setSubmittedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!courseId) {
          console.warn('[useAssignmentsByCourse] No courseId provided')
          setAssignments([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        console.log('[useAssignmentsByCourse] Fetching assignments for courseId:', courseId)
        const res = await assignmentsApi.list({ courseId })
        console.log('[useAssignmentsByCourse] API Response:', res)
        
        const all = Array.isArray(res.data) ? res.data : []
        console.log('[useAssignmentsByCourse] Total assignments fetched:', all.length)

        // Verify data belongs to this course/section (safety check)
        const filtered = all.filter((a) => {
          if (courseId && a.courseId === courseId) return true
          if (sectionId && a.sectionId === sectionId) return true
          return false
        })

        console.log('[useAssignmentsByCourse] Filtered assignments:', filtered.length)

        // Check which are already submitted
        const submittedSet = new Set()
        await Promise.all(
          filtered.map(async (a) => {
            try {
              const subRes = await assignmentsApi.getSubmissions(a.id)
              const subs = Array.isArray(subRes.data) ? subRes.data : []
              if (subs.length > 0) submittedSet.add(a.id)
            } catch {
              // skip
            }
          })
        )
        setSubmittedIds(submittedSet)

        // Set total count and paginate
        setTotalCount(filtered.length)
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
        const endIdx = startIdx + ITEMS_PER_PAGE
        const paginatedAssignments = filtered.slice(startIdx, endIdx)
        setAssignments(paginatedAssignments)
      } catch (err) {
        console.error('[useAssignmentsByCourse] Error loading assignments:', err)
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
    submittedIds, 
    loading, 
    error,
    totalCount,
    totalPages,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
  }
}
