import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSession, loginGoogle, logout } from '@/services/auth.api'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const state = ref<'unknown' | 'loading' | 'authenticated' | 'anonymous'>('unknown')
  const user = ref<User | null>(null)
  const generation = ref(0)
  let restorePromise: Promise<void> | null = null

  function clear() {
    generation.value++
    user.value = null
    state.value = 'anonymous'
    window.dispatchEvent(new Event('sensitive-clear'))
  }
  async function restore() {
    if (state.value !== 'unknown' && state.value !== 'loading') return
    if (!restorePromise) {
      state.value = 'loading'
      const current = generation.value
      restorePromise = getSession().then((session) => {
        if (current !== generation.value) return
        user.value = session.authenticated ? session.user : null
        state.value = session.authenticated ? 'authenticated' : 'anonymous'
      }).catch(() => {
        if (current === generation.value) state.value = 'anonymous'
      }).finally(() => { restorePromise = null })
    }
    await restorePromise
  }
  async function signIn(credential: string) {
    const current = generation.value
    const session = await loginGoogle(credential)
    if (current !== generation.value) return
    user.value = session.user
    state.value = session.authenticated ? 'authenticated' : 'anonymous'
  }
  async function signOut() {
    await logout()
    clear()
  }
  return { state, user, generation, clear, restore, signIn, signOut }
})
