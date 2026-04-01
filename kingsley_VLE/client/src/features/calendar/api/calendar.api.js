import api from '../../../lib/api'

export const calendarApi = {
  getRange: (from, to, params = {}) =>
    api.get('/calendar', { params: { from, to, ...params } }),

  getByDate: (date) => api.get(`/calendar/${date}`),

  createReminder: (data) => api.post('/calendar', data),
  updateReminder: (id, data) => api.put(`/calendar/reminders/${id}`, data),
  deleteReminder: (id) => api.delete(`/calendar/reminders/${id}`),
}
