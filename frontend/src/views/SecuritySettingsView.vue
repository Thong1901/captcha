<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteFace, getFaceStatus } from '@/services/face.api'
import { errorMessage } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import type { FaceStatus } from '@/types'

const face = ref<FaceStatus | null>(null)
const busy = ref(false)
const message = ref('')
const error = ref('')
const auth = useAuthStore()
const router = useRouter()
onMounted(async () => { try { face.value = await getFaceStatus() } catch (cause) { error.value = errorMessage(cause, 'Tải trạng thái') } })
async function removeFace() {
  if (!window.confirm('Xóa mẫu khuôn mặt đã đăng ký? Quyền xem hồ sơ hiện tại cũng sẽ bị thu hồi.')) return
  busy.value = true; error.value = ''; message.value = ''
  try { await deleteFace(); window.dispatchEvent(new Event('sensitive-clear')); face.value = await getFaceStatus(); message.value = 'Đã xóa mẫu khuôn mặt và thu hồi quyền truy cập liên quan.' }
  catch (cause) { error.value = errorMessage(cause, 'Xóa mẫu') }
  finally { busy.value = false }
}
async function signOut() {
  busy.value = true
  try { await auth.signOut(); await router.replace('/login') }
  catch (cause) { error.value = errorMessage(cause, 'Đăng xuất') }
  finally { busy.value = false }
}
</script>
<template>
  <div class="page-content narrow-page"><div class="page-heading"><span class="eyebrow">TÀI KHOẢN / CÀI ĐẶT</span><h1>Bảo mật & dữ liệu</h1><p>Kiểm soát dữ liệu khuôn mặt và phiên đăng nhập của bạn.</p></div><section class="panel settings-panel"><div class="setting-icon">◎</div><div class="setting-body"><span class="eyebrow">DỮ LIỆU SINH TRẮC</span><h2>Mẫu khuôn mặt</h2><p>{{ face?.enrolled ? 'Bạn đã đăng ký mẫu khuôn mặt để so khớp ảnh.' : 'Chưa có mẫu khuôn mặt nào được đăng ký.' }}</p><span class="status-label" :class="face?.enrolled ? 'good' : 'pending'"><i></i>{{ face?.enrolled ? 'Đã đăng ký' : 'Chưa đăng ký' }}</span></div><button class="button button-danger" type="button" :disabled="busy || !face?.enrolled" @click="removeFace">Xóa mẫu</button></section><section class="panel settings-panel"><div class="setting-icon lavender">↪</div><div class="setting-body"><span class="eyebrow">PHIÊN ĐĂNG NHẬP</span><h2>Đăng xuất tài khoản</h2><p>Kết thúc phiên hiện tại và xóa dữ liệu nhạy cảm đang hiển thị.</p></div><button class="button button-outline" type="button" :disabled="busy" @click="signOut">Đăng xuất</button></section><p v-if="message" class="alert success" role="status">{{ message }}</p><p v-if="error" class="alert error" role="alert">{{ error }}</p></div>
</template>
