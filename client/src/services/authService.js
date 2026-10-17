import { apiRequest } from "../lib/apiClient.js";

export const authService = {
  login({ email, password }) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  getCurrentUser(signal) {
    return apiRequest("/auth/me", { signal });
  },

  logout() {
    return apiRequest("/auth/logout", {
      method: "POST",
    });
  },
};
