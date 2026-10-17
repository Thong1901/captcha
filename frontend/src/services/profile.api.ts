import { api } from './http'
import type { AccessStatus, Profile } from '@/types'

export const getAccessStatus = (signal?: AbortSignal) =>
  api<AccessStatus>('/auth/access-status', { signal })
export const getOwnProfile = (signal?: AbortSignal) =>
  api<Profile>('/me/military-profile', { signal })
export async function getPortrait(signal?: AbortSignal): Promise<Blob> {
  const response = await fetch('/api/me/military-profile/portrait', {
    credentials: 'same-origin', cache: 'no-store', signal,
  })
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('session-expired'))
    throw new Error(`HTTP ${response.status}`)
  }
  return response.blob()
}
