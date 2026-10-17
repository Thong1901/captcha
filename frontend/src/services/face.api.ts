import { api } from './http'
import type { FaceResult, FaceStatus } from '@/types'

export const getFaceStatus = () => api<FaceStatus>('/face/status')
export const enrollFace = (image: Blob) =>
  api<{ enrolled: true }>('/face/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', 'x-face-consent': 'yes' },
    body: image,
  })
export const compareFace = (image: Blob) =>
  api<FaceResult>('/face/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: image,
  })
export const deleteFace = () => api<{ enrolled: false }>('/face/template', { method: 'DELETE' })
