import api from "../../../lib/api";

export const calendarApi = {
  // Filtering is handled server-side based on req.user from authentication
  // Backend automatically filters:
  // - Admin: shows all events and assignments
  // - Teacher: shows assigned courses + institution-type events
  // - Student: shows enrolled courses + institution-type events
  getRange: (from, to, params = {}) =>
    api.get("/calendar", { params: { from, to, ...params } }),

  getByDate: (date) => api.get(`/calendar/${date}`),

  createReminder: (data) => api.post("/calendar", data),
  updateReminder: (id, data) => api.put(`/calendar/reminders/${id}`, data),
  deleteReminder: (id) => api.delete(`/calendar/reminders/${id}`),
};
