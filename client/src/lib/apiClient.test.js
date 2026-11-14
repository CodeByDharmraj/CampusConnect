import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiClientError, apiClient, apiRequest } from './apiClient.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mockResponse({
  status = 200,
  payload = {},
  contentType = 'application/json',
} = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) =>
        name.toLowerCase() === 'content-type' ? contentType : null,
    },
    json: vi.fn().mockResolvedValue(payload),
  }
}

describe('API client', () => {
  it('sends a GET request and returns parsed JSON', async () => {
    const payload = {
      success: true,
      data: { status: 'ok' },
    }
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ payload }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiClient.get('/health')

    expect(result).toEqual(payload)
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:5000/api/v1/health')
    expect(options.method).toBe('GET')
    expect(options.credentials).toBe('include')
    expect(options.headers.get('Accept')).toBe('application/json')
  })

  it('converts unsuccessful HTTP responses into ApiClientError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        status: 404,
        payload: {
          success: false,
          message: 'Route not found',
          code: 'RESOURCE_NOT_FOUND',
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/does-not-exist')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Route not found',
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
    })
  })

  it('sends JSON when posting an object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse())
    vi.stubGlobal('fetch', fetchMock)

    const body = { title: 'Test announcement' }

    await apiClient.post('/announcements', body)

    const [, options] = fetchMock.mock.calls[0]

    expect(options.method).toBe('POST')
    expect(options.headers.get('Content-Type')).toBe('application/json')
    expect(options.body).toBe(JSON.stringify(body))
  })

  it('rejects API paths that do not start with a slash', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('health')).rejects.toBeInstanceOf(TypeError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exports a usable API error class', () => {
    const error = new ApiClientError('Request failed', 400, 'REQUEST_FAILED')

    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(400)
    expect(error.code).toBe('REQUEST_FAILED')
  })
})
