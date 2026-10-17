import { api } from './http'
import type { AuthConfig, Session } from '@/types'

export const getAuthConfig = () => api<AuthConfig>('/auth/config')
export const getSession = () => api<Session>('/auth/session')
export const loginGoogle = (credential: string) =>
  api<Session>('/auth/google/credential', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
export const logout = () => api<unknown>('/auth/logout', { method: 'POST' })
