import { useCallback, useEffect, useMemo, useState } from 'react'

import { authApi } from '../lib/authApi.js'
import { AuthContext } from './AuthContext.js'

let refreshInFlight = null

function requestSessionRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = authApi.refresh().finally(() => {
      refreshInFlight = null
    })
  }

  return refreshInFlight
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = Boolean(user && accessToken)

  const clearSession = useCallback(() => {
    setUser(null)
    setAccessToken(null)
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials)

    const authenticatedUser = response?.data?.user
    const token = response?.data?.accessToken

    if (!authenticatedUser || !token) {
      throw new Error('The login response is missing authentication data.')
    }

    setUser(authenticatedUser)
    setAccessToken(token)

    return authenticatedUser
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const response = await requestSessionRefresh()

      const authenticatedUser = response?.data?.user
      const token = response?.data?.accessToken

      if (!authenticatedUser || !token) {
        throw new Error('The refresh response is missing authentication data.')
      }

      setUser(authenticatedUser)
      setAccessToken(token)

      return true
    } catch {
      clearSession()
      return false
    } finally {
      setIsLoading(false)
    }
  }, [clearSession])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  useEffect(() => {
    void Promise.resolve().then(() => refreshSession())
  }, [refreshSession])

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [
      user,
      accessToken,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
