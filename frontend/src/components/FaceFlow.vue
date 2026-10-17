<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import FaceCamera from './FaceCamera.vue'
import { compareFace, enrollFace, getFaceStatus } from '@/services/face.api'
import { errorMessage, ApiError } from '@/services/http'
import type { FaceResult, FaceStatus } from '@/types'

const props = defineProps<{ mode: 'enroll' | 'compare' }>()
const router = useRouter()
const camera = ref<InstanceType<typeof FaceCamera> | null>(null)
const status = ref<FaceStatus | null>(null)
const busy = ref(false)
const consent = ref(false)
const result = ref<FaceResult | null>(null)
const message = ref('')
const error = ref('')
const photo = ref<Blob | null>(null)

async function refresh() {
  try { status.value = await getFaceStatus() }
  catch (cause) { error.value = errorMessage(cause, 'Kiểm tra trạng thái') }
}
onMounted(refresh)
async function submit() {
  if (!photo.value || busy.value || (props.mode === 'enroll' && !consent.value)) return
  busy.value = true
  error.value = ''
  message.value = ''
  result.value = null
  try {
    if (props.mode === 'enroll') {
      await enrollFace(photo.value)
      message.value = 'Đã đăng ký mẫu khuôn mặt thành công.'
      camera.value?.clear()
      photo.value = null
      await refresh()
    } else {
      result.value = await compareFace(photo.value)
    }
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) await refresh()
    error.value = errorMessage(cause, props.mode === 'enroll' ? 'Đăng ký' : 'So khớp')
  } finally { busy.value = false }
}
</script>

<template>
  <div class="page-content">
    <div class="page-heading">
      <button class="back-link" type="button" @click="router.push('/dashboard')">← Tổng quan</button>
      <span class="eyebrow">{{ mode === 'enroll' ? 'BƯỚC 01 / ĐĂNG KÝ' : 'BƯỚC 02 / SO KHỚP' }}</span>
      <h1>{{ mode === 'enroll' ? 'Đăng ký khuôn mặt' : 'So khớp khuôn mặt' }}</h1>
      <p>{{ mode === 'enroll' ? 'Tạo mẫu tham chiếu để sử dụng trong các bước xác minh sau này.' : 'Chụp ảnh mới để so sánh với mẫu đã đăng ký.' }}</p>
    </div>
    <div class="flow-grid">
      <FaceCamera ref="camera" @image="photo = $event" />
      <div class="flow-side">
        <section class="panel instruction-panel">
          <span class="eyebrow">HƯỚNG DẪN</span>
          <h2>Trước khi tiếp tục</h2>
          <ol class="steps">
            <li><span>01</span> Đảm bảo đủ ánh sáng và nhìn thẳng camera.</li>
            <li><span>02</span> Chỉ có một khuôn mặt trong khung hình.</li>
            <li><span>03</span> Chụp ảnh rồi xác nhận thao tác.</li>
          </ol>
          <p v-if="status && !status.configured" class="alert warning">Dịch vụ Face++ chưa được cấu hình.</p>
          <p v-if="mode === 'enroll' && status?.enrolled" class="alert info">Bạn đã có mẫu khuôn mặt. Hãy xóa mẫu cũ trong Cài đặt bảo mật nếu muốn đăng ký lại.</p>
          <p v-if="mode === 'compare' && status && !status.enrolled" class="alert warning">Chưa có mẫu khuôn mặt. Vui lòng đăng ký trước.</p>
        </section>
        <section class="panel submit-panel">
          <span class="eyebrow">XÁC NHẬN</span>
          <h2>{{ mode === 'enroll' ? 'Đồng ý xử lý dữ liệu' : 'Gửi ảnh so khớp' }}</h2>
          <p v-if="mode === 'enroll'">Ảnh của bạn sẽ được gửi đến Face++ để tạo mẫu tham chiếu. Bạn có thể xóa mẫu sau này trong Cài đặt bảo mật.</p>
          <p v-else>Điểm so khớp do Face++ cung cấp; đây chưa phải xác minh người thật (PAD).</p>
          <label v-if="mode === 'enroll'" class="consent"><input v-model="consent" type="checkbox" /> <span>Tôi đồng ý gửi ảnh khuôn mặt đến Face++ để đăng ký mẫu tham chiếu.</span></label>
          <button class="button button-primary full" type="button" :disabled="busy || !photo || !status?.configured || (mode === 'enroll' ? status.enrolled || !consent : !status.enrolled)" @click="submit">
            {{ busy ? 'Đang xử lý...' : mode === 'enroll' ? 'Đăng ký khuôn mặt' : 'So khớp ảnh' }}
          </button>
          <p v-if="message" class="alert success" role="status">{{ message }}</p>
          <p v-if="error" class="alert error" role="alert">{{ error }}</p>
          <div v-if="result" class="result-card" role="status">
            <strong>{{ result.matched ? 'Ảnh khớp với mẫu' : 'Ảnh không khớp với mẫu' }}</strong>
            <div class="metric-row"><span>Điểm so khớp</span><b>{{ result.confidence.toFixed(2) }}</b></div>
            <div class="metric-row"><span>Ngưỡng đối chiếu</span><b>{{ result.threshold.toFixed(2) }}</b></div>
            <p>Chưa kiểm tra PAD/liveness. Kết quả này không cấp quyền xem hồ sơ.</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
