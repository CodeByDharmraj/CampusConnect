import { apiRequest } from "../lib/apiClient.js";

export const announcementService = {
  getAll(signal) {
    return apiRequest("/announcements", { signal });
  },

  getById(id, signal) {
    return apiRequest(`/announcements/${encodeURIComponent(id)}`, { signal });
  },

  create(announcement) {
    return apiRequest("/announcements", {
      method: "POST",
      body: announcement,
    });
  },

  markAsRead(id) {
    return apiRequest(`/announcements/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    });
  },
};
