import type { ApiResult } from '../types'
import { getToken } from './auth'

export class ApiError extends Error {
  status: number
  code?: number

  constructor(message: string, status: number, code?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function request<T>(url: string, options: RequestInit = {}) {
  const token = getToken()
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const text = await response.text()
  const result = text ? JSON.parse(text) as ApiResult<T> : null

  if (!response.ok || (result && result.code !== 200)) {
    throw new ApiError(result?.message || '请求失败', response.status, result?.code)
  }

  return result?.data as T
}
