<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getAuthConfig } from '@/services/auth.api'
import { errorMessage } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

type GoogleApi = { accounts: { id: {
  initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
  renderButton: (parent: HTMLElement, options: { theme: string; size: string; shape: string; width: number }) => void
} } }
declare global { interface Window { google?: GoogleApi } }

const target = ref<HTMLElement | null>(null)
const error = ref('')
const busy = ref(false)
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
let scriptPromise: Promise<void> | null = null

function loadGoogle() {
  if (window.google) return Promise.resolve()
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { scriptPromise = null; reject(new Error('Không tải được Google Sign-In.')) }
    document.head.append(script)
  })
  return scriptPromise
}

onMounted(async () => {
  try {
    const config = await getAuthConfig()
    if (config.appOrigin !== window.location.origin) {
      error.value = `Origin chưa khớp backend. Cần APP_ORIGIN=${window.location.origin}.`
      return
    }
    if (!config.enabled || !config.googleClientId) {
      error.value = 'Chưa cấu hình GOOGLE_CLIENT_ID trên backend.'
      return
    }
    await loadGoogle()
    if (!window.google || !target.value) throw new Error('Không thể khởi tạo Google Sign-In.')
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async ({ credential }) => {
        if (busy.value) return
        busy.value = true
        error.value = ''
        try {
          await auth.signIn(credential)
          const redirect = route.query.redirect
          await router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard')
        } catch (cause) { error.value = errorMessage(cause, 'Đăng nhập') }
        finally { busy.value = false }
      },
    })
    window.google.accounts.id.renderButton(target.value, { theme: 'outline', size: 'large', shape: 'pill', width: 290 })
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Không tải được đăng nhập Google.' }
})
</script>

<template>
  <div class="google-signin">
    <div ref="target" class="google-button"></div>
    <p v-if="busy" role="status">Đang xác minh tài khoản Google...</p>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
  </div>
</template>
