import type { ApiResult } from '../types'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
  phone?: string
  email?: string
}

export interface LoginResponse {
  token: string
  tokenType: string
  expiresIn: number
  userId: number
  username: string
}

const TOKEN_KEY = 'seckill_token'
const USER_KEY = 'seckill_user'

async function request<T>(url: string, options: RequestInit) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const result = (await response.json()) as ApiResult<T>

  if (!response.ok || result.code !== 200) {
    throw new Error(result.message || '请求失败')
  }

  return result.data
}

export function login(payload: LoginPayload) {
  return request<LoginResponse>('/api/user/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function register(payload: RegisterPayload) {
  return request<void>('/api/user/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveSession(session: LoginResponse) {
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(USER_KEY, JSON.stringify({
    userId: session.userId,
    username: session.username,
  }))
}

export function getCurrentUser(): { userId: number; username: string } | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as { userId: number; username: string }
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
