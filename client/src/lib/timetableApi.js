import { apiClient } from './apiClient.js'

export async function getTimetable(accessToken) {
  if (!accessToken) {
    throw new Error('Authentication is required to load the timetable.')
  }

  const response = await apiClient.get('/timetable', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return response.data.entries
}
