const DEFAULT_API_BASE_URL = 'http://localhost:5000/api/v1'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

export class ApiClientError extends Error {
  constructor(message, status, code) {
    super(message)

    this.name = 'ApiClientError'
    this.status = status
    this.code = code
  }
}

export async function apiRequest(path, options = {}) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new TypeError('API path must start with a slash.')
  }

  const { headers: suppliedHeaders, ...requestOptions } = options
  const headers = new Headers(suppliedHeaders)

  headers.set('Accept', 'application/json')

  const isFormData =
    typeof FormData !== 'undefined' && requestOptions.body instanceof FormData

  if (requestOptions.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers,
    credentials: 'include',
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    throw new ApiClientError(
      payload?.message || `Request failed with status ${response.status}.`,
      response.status,
      payload?.code || 'REQUEST_FAILED',
    )
  }

  return payload
}

export const apiClient = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),

  post: (path, body, options = {}) =>
    apiRequest(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: (path, body, options = {}) =>
    apiRequest(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: (path, body, options = {}) =>
    apiRequest(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: (path, options = {}) =>
    apiRequest(path, { ...options, method: 'DELETE' }),
}
