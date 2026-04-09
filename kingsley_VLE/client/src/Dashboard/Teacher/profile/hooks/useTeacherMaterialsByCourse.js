import { useEffect, useState } from 'react'
import { classMaterialsApi } from '../../../../features/classMaterials/api/classMaterials.api'

const ITEMS_PER_PAGE = 15

export const useTeacherMaterialsByCourse = (courseId, sectionId, currentPage = 1) => {
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

        let all = []
        if (res.data) {
          if (res.data.materials && Array.isArray(res.data.materials)) {
            all = res.data.materials
          } else if (Array.isArray(res.data)) {
            all = res.data
          } else if (res.data.data && Array.isArray(res.data.data)) {
            all = res.data.data
          }
        }

        const filtered = all.filter((m) => {
          if (courseId && m.courseId === courseId) return true
          if (sectionId && m.sectionId === sectionId) return true
          return false
        })

        setTotalCount(filtered.length)
        const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
        setMaterials(filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE))
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load materials')
        setMaterials([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [courseId, sectionId, currentPage])

  return {
    materials,
    loading,
    error,
    totalCount,
    totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
  }
}
