<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { errorMessage } from '@/services/http'

const auth = useAuthStore()
const router = useRouter()
const signingOut = ref(false)
const error = ref('')
const nav = [
  { to: '/dashboard', icon: '▦', label: 'Tổng quan' },
  { to: '/face/enroll', icon: '◎', label: 'Đăng ký khuôn mặt' },
  { to: '/face/compare', icon: '◈', label: 'So khớp ảnh' },
  { to: '/profile', icon: '▤', label: 'Hồ sơ của tôi' },
  { to: '/settings/security', icon: '⚙', label: 'Bảo mật' },
]
function expired() { auth.clear(); void router.replace('/login') }
onMounted(() => window.addEventListener('session-expired', expired))
onBeforeUnmount(() => window.removeEventListener('session-expired', expired))
async function signOut() {
  signingOut.value = true
  error.value = ''
  try { await auth.signOut(); await router.replace('/login') }
  catch (cause) { error.value = errorMessage(cause, 'Đăng xuất') }
  finally { signingOut.value = false }
}
</script>

<template>
  <div v-if="auth.state === 'loading' || auth.state === 'unknown'" class="loading-screen" role="status">Đang kiểm tra phiên đăng nhập...</div>
  <div v-else-if="auth.state === 'authenticated'" class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/dashboard" class="brand"><span class="brand-mark">◈</span><span>sentinel<small>IDENTITY PLATFORM</small></span></RouterLink>
      <div class="sidebar-section">KHÔNG GIAN LÀM VIỆC</div>
      <nav aria-label="Điều hướng chính">
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-link"><span class="nav-icon">{{ item.icon }}</span>{{ item.label }}</RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note"><span class="note-icon">✦</span><strong>Bảo mật theo phiên</strong><p>Dữ liệu nhạy cảm chỉ hiển thị khi backend cho phép.</p></div>
        <div class="account"><div class="avatar">{{ (auth.user?.name || auth.user?.email || '?').slice(0, 1).toUpperCase() }}</div><div class="account-info"><strong>{{ auth.user?.name || 'Tài khoản' }}</strong><small>{{ auth.user?.email }}</small></div></div>
        <button class="logout-link" type="button" :disabled="signingOut" @click="signOut">↪ <span>{{ signingOut ? 'Đang đăng xuất...' : 'Đăng xuất' }}</span></button>
        <p v-if="error" class="alert error" role="alert">{{ error }}</p>
      </div>
    </aside>
    <div class="main-area">
      <header class="topbar"><span class="topbar-location">BẢNG ĐIỀU KHIỂN <span>/</span> SENTINEL</span><div class="topbar-right"><span class="system-status"><i></i> Hệ thống hoạt động</span><span class="top-avatar">{{ (auth.user?.name || auth.user?.email || '?').slice(0, 1).toUpperCase() }}</span></div></header>
      <main><RouterView /></main>
    </div>
  </div>
  <RouterView v-else />
</template>
