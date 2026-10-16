import { apiRequest } from "../lib/apiClient.js";

export const systemService = {
  getHealth(signal) {
    return apiRequest("/health", { signal });
  },
};
