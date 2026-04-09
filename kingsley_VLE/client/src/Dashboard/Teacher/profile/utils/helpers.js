export const fmt = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const isOverdue = (dueDate) => {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}
