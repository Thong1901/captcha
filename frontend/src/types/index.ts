export type User = { id: string; email: string; name: string | null }
export type Session = { authenticated: boolean; user: User | null }
export type AuthConfig = { enabled: boolean; googleClientId: string; appOrigin: string }
export type FaceStatus = { configured: boolean; enrolled: boolean }
export type FaceResult = {
  matched: boolean
  confidence: number
  threshold: number
  livenessVerified: boolean
}
export type AccessStatus = {
  canViewProfile: boolean
  expiresAt: string | null
  roles: { role: string; scopeUnitCode: string | null }[]
}
export type Profile = {
  id: string
  fullName: string
  dateOfBirth: string
  phoneNumber: string
  address: string
  unitCode: string
  status: string
  hasPortrait: boolean
  linked: boolean
  createdAt: string
  updatedAt: string
}
