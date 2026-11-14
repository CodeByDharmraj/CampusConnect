import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './apiClient.js'
import { authApi } from './authApi.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Authentication API', () => {
  it('sends login credentials to the login endpoint', async () => {
    const response = { success: true, data: { accessToken: 'access-token' } }
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue(response)

    const credentials = {
      email: 'student@example.edu',
      password: 'password123',
    }

    await expect(authApi.login(credentials)).resolves.toEqual(response)

    expect(spy).toHaveBeenCalledWith('/auth/login', credentials)
  })

  it('requests access-token rotation', async () => {
    const response = { success: true, data: { accessToken: 'new-token' } }
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue(response)

    await expect(authApi.refresh()).resolves.toEqual(response)

    expect(spy).toHaveBeenCalledWith('/auth/refresh', {})
  })

  it('requests logout', async () => {
    const response = { success: true, message: 'Logged out successfully.' }
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue(response)

    await expect(authApi.logout()).resolves.toEqual(response)

    expect(spy).toHaveBeenCalledWith('/auth/logout', {})
  })

  it('requests the current user with a bearer access token', async () => {
    const response = { success: true, data: { user: { role: 'student' } } }
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue(response)

    await expect(authApi.me('access-token')).resolves.toEqual(response)

    expect(spy).toHaveBeenCalledWith('/auth/me', {
      headers: {
        Authorization: 'Bearer access-token',
      },
    })
  })

  it('provisions an account using the administrator access token', async () => {
    const response = { success: true, data: { user: { role: 'faculty' } } }
    const spy = vi.spyOn(apiClient, 'post').mockResolvedValue(response)

    const userData = {
      name: 'Faculty Member',
      email: 'faculty@example.edu',
      password: 'password123',
      role: 'faculty',
    }

    await expect(
      authApi.provisionUser(userData, 'admin-access-token'),
    ).resolves.toEqual(response)

    expect(spy).toHaveBeenCalledWith('/auth/register', userData, {
      headers: {
        Authorization: 'Bearer admin-access-token',
      },
    })
  })
})
