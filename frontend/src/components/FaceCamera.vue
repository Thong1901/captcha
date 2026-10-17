<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCamera } from '@/composables/useCamera'

const videoElement = ref<HTMLVideoElement | null>(null)
const camera = useCamera(videoElement)
const emit = defineEmits<{ image: [value: Blob | null] }>()
watch(camera.image, (value) => emit('image', value))
defineExpose({ clear: camera.clearImage })
</script>

<template>
  <section class="camera-card">
    <div class="camera-header">
      <div>
        <span class="eyebrow">CHỤP ẢNH AN TOÀN</span>
        <h2>Camera của bạn</h2>
      </div>
      <span class="state-pill" :class="camera.active.value ? 'live' : ''">
        <span class="state-dot"></span>{{ camera.active.value ? 'Đang bật' : 'Đang tắt' }}
      </span>
    </div>
    <div class="camera-stage">
      <video ref="videoElement" autoplay muted playsinline :hidden="!camera.active.value" aria-label="Hình ảnh trực tiếp từ camera"></video>
      <img v-if="camera.imageUrl.value" :src="camera.imageUrl.value" alt="Ảnh khuôn mặt vừa chụp" />
      <div v-if="!camera.active.value && !camera.imageUrl.value" class="camera-placeholder">
        <div class="viewfinder"><span class="face-icon">◉</span></div>
        <strong>Camera chưa được bật</strong>
        <p>Ảnh chỉ được gửi khi bạn chọn một thao tác.</p>
      </div>
      <div v-if="camera.active.value" class="camera-guide"><span></span> Đặt khuôn mặt vào giữa khung hình</div>
    </div>
    <p v-if="camera.error.value" class="alert error" role="alert">{{ camera.error.value }}</p>
    <div class="camera-actions">
      <button v-if="!camera.active.value" class="button button-dark" type="button" @click="camera.start()">
        {{ camera.image.value ? 'Chụp lại' : 'Bật camera' }}
      </button>
      <template v-else>
        <button class="button button-primary" type="button" @click="camera.capture()">Chụp ảnh</button>
        <button class="button button-ghost" type="button" @click="camera.stop()">Tắt camera</button>
      </template>
      <button v-if="camera.image.value" class="button button-ghost" type="button" @click="camera.clearImage()">Bỏ ảnh</button>
    </div>
  </section>
</template>
