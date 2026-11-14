import { apiClient } from './apiClient.js'

export const authApi = {
  login(credentials) {
    return apiClient.post('/auth/login', credentials)
  },

  refresh() {
    return apiClient.post('/auth/refresh', {})
  },

  logout() {
    return apiClient.post('/auth/logout', {})
  },

  me(accessToken) {
    return apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  },

  provisionUser(userData, accessToken) {
    return apiClient.post('/auth/register', userData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  },
}
