<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { getAccessStatus, getOwnProfile, getPortrait } from '@/services/profile.api'
import { ApiError, errorMessage } from '@/services/http'
import type { AccessStatus, Profile } from '@/types'

const access = ref<AccessStatus | null>(null)
const profile = ref<Profile | null>(null)
const portraitUrl = ref<string | null>(null)
const loading = ref(true)
const message = ref('')
let controller: AbortController | null = null
let timer: number | null = null
let generation = 0

function clear() {
  generation++
  controller?.abort()
  controller = null
  if (timer !== null) window.clearTimeout(timer)
  timer = null
  profile.value = null
  access.value = null
  if (portraitUrl.value) URL.revokeObjectURL(portraitUrl.value)
  portraitUrl.value = null
}
async function refresh() {
  clear()
  loading.value = true
  message.value = ''
  const current = generation
  const request = new AbortController()
  controller = request
  try {
    const nextAccess = await getAccessStatus(request.signal)
    if (current !== generation) return
    access.value = nextAccess
    const expires = nextAccess.expiresAt ? Date.parse(nextAccess.expiresAt) : 0
    if (!nextAccess.canViewProfile || !expires || expires <= Date.now()) {
      message.value = 'Hồ sơ đang khóa. Cần xác minh người thật bằng PAD để xem dữ liệu này. Chức năng PAD chưa được backend cung cấp.'
      return
    }
    timer = window.setTimeout(() => { clear(); message.value = 'Quyền xem hồ sơ đã hết hạn. Vui lòng kiểm tra lại quyền.' }, Math.max(0, expires - Date.now()))
    const nextProfile = await getOwnProfile(request.signal)
    if (current !== generation || expires <= Date.now()) return
    profile.value = nextProfile
    if (nextProfile.hasPortrait) {
      try {
        const blob = await getPortrait(request.signal)
        if (current === generation && expires > Date.now()) portraitUrl.value = URL.createObjectURL(blob)
      } catch { /* Portrait may be absent or grant may expire during fetch. */ }
    }
  } catch (cause) {
    if (current !== generation || request.signal.aborted) return
    if (cause instanceof ApiError && cause.status === 403) message.value = 'Hồ sơ đang khóa. Cần xác minh người thật (PAD) để xem.'
    else if (cause instanceof ApiError && cause.status === 404) message.value = 'Chưa có hồ sơ cá nhân được liên kết với tài khoản này.'
    else message.value = errorMessage(cause, 'Tải hồ sơ')
  } finally { if (current === generation) loading.value = false }
}
onMounted(() => { window.addEventListener('sensitive-clear', clear); void refresh() })
onBeforeUnmount(() => { window.removeEventListener('sensitive-clear', clear); clear() })
</script>

<template>
  <div class="page-content narrow-page"><div class="page-heading"><span class="eyebrow">DỮ LIỆU CÁ NHÂN</span><h1>Hồ sơ của tôi</h1><p>Thông tin hồ sơ chỉ hiển thị khi backend xác nhận quyền truy cập hợp lệ.</p></div>
    <section v-if="loading" class="panel profile-state" role="status"><div class="lock-art">◌</div><h2>Đang kiểm tra quyền...</h2><p>Vui lòng chờ trong giây lát.</p></section>
    <section v-else-if="profile" class="panel profile-detail"><div class="profile-detail-head"><div><span class="eyebrow">HỒ SƠ ĐƯỢC BẢO VỆ</span><h2>{{ profile.fullName }}</h2><p>Quyền xem có hiệu lực đến {{ access?.expiresAt ? new Date(access.expiresAt).toLocaleTimeString('vi-VN') : '' }}</p></div><span class="status-label good"><i></i>Đã cấp quyền</span></div><div class="profile-main"><img v-if="portraitUrl" :src="portraitUrl" alt="Ảnh chân dung hồ sơ" class="profile-portrait" /><div class="profile-fields"><div><span>Ngày sinh</span><strong>{{ profile.dateOfBirth.split('-').reverse().join('/') }}</strong></div><div><span>Số điện thoại</span><strong>{{ profile.phoneNumber }}</strong></div><div><span>Địa chỉ</span><strong>{{ profile.address }}</strong></div><div><span>Mã đơn vị</span><strong>{{ profile.unitCode }}</strong></div></div></div></section>
    <section v-else class="panel profile-state"><div class="lock-art">♙</div><span class="eyebrow">QUYỀN TRUY CẬP</span><h2>Hồ sơ đang được bảo vệ</h2><p>{{ message }}</p><button class="button button-dark" type="button" @click="refresh">Kiểm tra lại quyền</button></section>
    <div class="profile-footnote"><span>✦</span><p>So khớp ảnh tĩnh chưa chứng minh người thật và không cấp quyền xem hồ sơ. Dữ liệu được xóa khỏi giao diện khi hết hạn hoặc đăng xuất.</p></div>
  </div>
</template>
