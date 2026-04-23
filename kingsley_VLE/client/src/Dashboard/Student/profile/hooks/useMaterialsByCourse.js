import { useEffect, useState } from 'react'
import { classMaterialsApi } from '../../../../features/classMaterials/api/classMaterials.api'

const ITEMS_PER_PAGE = 15

export const useMaterialsByCourse = (courseId, sectionId, currentPage = 1) => {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!courseId) {
          setMaterials([])
          setTotalCount(0)
          setLoading(false)
          return
        }

        const res = await classMaterialsApi.list({ courseId })
        // console.log('[useMaterialsByCourse] API Response:', res)

        // Handle multiple response structures
        let all = []
        if (res.data) {
          // Check if response has 'materials' property (paginated response)
          if (res.data.materials && Array.isArray(res.data.materials)) {
            all = res.data.materials
          } else if (Array.isArray(res.data)) {
            // Direct array response
            all = res.data
          } else if (res.data.data && Array.isArray(res.data.data)) {
            // Nested data property
            all = res.data.data
          }
        }
        // console.log('[useMaterialsByCourse] Total materials fetched:', all.length)

        // Filter to only materials belonging to this course/section
        const filtered = all.filter((m) => {
          if (courseId && m.courseId === courseId) return true
          if (sectionId && m.sectionId === sectionId) return true
          return false
        })
        // console.log('[useMaterialsByCourse] Filtered materials:', filtered.length)

        // Set total count and paginate
        setTotalCount(filtered.length)
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
        const endIdx = startIdx + ITEMS_PER_PAGE
        const paginatedMaterials = filtered.slice(startIdx, endIdx)
        setMaterials(paginatedMaterials)
      } catch (err) {
        console.error('Error loading class materials:', err)
        setError(
          err.response?.data?.error ||
            err.message ||
            'Failed to load materials'
        )
        setMaterials([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [courseId, sectionId, currentPage])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return { 
    materials, 
    loading, 
    error,
    totalCount,
    totalPages,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
  }
}
