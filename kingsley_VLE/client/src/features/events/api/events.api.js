import api from "../../../lib/api";

export const eventsApi = {
  list: (params = {}) => api.get("/events", { params }),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => {
    // console.log("[eventsApi.create] Sending data:", data);
    return api.post("/events", data);
  },
  update: (id, data) => {
    // console.log("[eventsApi.update] Event ID:", id, "Data:", data);
    return api.put(`/events/${id}`, data);
  },
  delete: (id) => api.delete(`/events/${id}`),
  getSemesters: (params = {}) => api.get("/semesters", { params }),
};
