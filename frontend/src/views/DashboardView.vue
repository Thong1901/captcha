<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getFaceStatus } from '@/services/face.api'
import { getAccessStatus } from '@/services/profile.api'
import { errorMessage } from '@/services/http'
import type { AccessStatus, FaceStatus } from '@/types'

const auth = useAuthStore()
const face = ref<FaceStatus | null>(null)
const access = ref<AccessStatus | null>(null)
const error = ref('')
onMounted(async () => {
  try {
    const [f, a] = await Promise.all([getFaceStatus(), getAccessStatus()])
    face.value = f
    access.value = a
  } catch (cause) { error.value = errorMessage(cause, 'Tải tổng quan') }
})
</script>

<template>
  <div class="page-content dashboard">
    <div class="welcome-row"><div><span class="eyebrow">KHÔNG GIAN CỦA BẠN</span><h1>Xin chào, {{ auth.user?.name?.split(' ').at(-1) || 'bạn' }} <span class="wave">✳</span></h1><p>Theo dõi trạng thái xác thực và quản lý dữ liệu của bạn tại đây.</p></div><div class="date-badge">{{ new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}</div></div>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <section class="hero-card"><div class="hero-content"><span class="hero-tag"><span></span> TRUNG TÂM XÁC THỰC</span><h2>Danh tính của bạn.<br /><em>Trong tầm kiểm soát.</em></h2><p>Thiết lập mẫu khuôn mặt để bắt đầu. Mỗi bước đều được thiết kế để bạn chủ động với dữ liệu của mình.</p><RouterLink :to="face?.enrolled ? '/face/compare' : '/face/enroll'" class="button hero-button">{{ face?.enrolled ? 'So khớp khuôn mặt' : 'Bắt đầu đăng ký' }} <span>↗</span></RouterLink></div><div class="hero-visual"><div class="hero-ring ring-1"></div><div class="hero-ring ring-2"></div><div class="hero-ring ring-3"></div><div class="hero-core">◈</div><div class="hero-spark s1">✦</div><div class="hero-spark s2">✧</div></div></section>
    <div class="section-title"><div><span class="eyebrow">TRẠNG THÁI HIỆN TẠI</span><h2>Tổng quan bảo mật</h2></div><span class="section-meta">Cập nhật theo phiên của bạn</span></div>
    <div class="status-grid"><RouterLink to="/face/enroll" class="status-card"><div class="card-icon peach">◎</div><div class="card-top"><span>01 / KHUÔN MẶT</span><b>↗</b></div><h3>Mẫu khuôn mặt</h3><p>{{ face?.enrolled ? 'Mẫu tham chiếu đã được đăng ký.' : 'Chưa đăng ký mẫu tham chiếu.' }}</p><span class="status-label" :class="face?.enrolled ? 'good' : 'pending'"><i></i>{{ face?.enrolled ? 'Đã đăng ký' : 'Cần thiết lập' }}</span></RouterLink><RouterLink to="/face/compare" class="status-card"><div class="card-icon lavender">◈</div><div class="card-top"><span>02 / SO KHỚP</span><b>↗</b></div><h3>Kiểm tra ảnh</h3><p>Đối chiếu ảnh mới với mẫu đã đăng ký.</p><span class="status-label neutral"><i></i>Chưa kiểm tra PAD</span></RouterLink><RouterLink to="/profile" class="status-card"><div class="card-icon mint">▤</div><div class="card-top"><span>03 / QUYỀN TRUY CẬP</span><b>↗</b></div><h3>Hồ sơ cá nhân</h3><p>{{ access?.canViewProfile ? 'Bạn đang có quyền xem hồ sơ.' : 'Hồ sơ đang được bảo vệ.' }}</p><span class="status-label" :class="access?.canViewProfile ? 'good' : 'pending'"><i></i>{{ access?.canViewProfile ? 'Có quyền truy cập' : 'Đang khóa' }}</span></RouterLink></div>
    <div class="bottom-grid"><section class="panel next-steps"><div class="panel-heading"><div><span class="eyebrow">QUY TRÌNH</span><h2>Các bước tiếp theo</h2></div></div><div class="timeline"><div><span class="timeline-index">1</span><div><strong>Đăng ký khuôn mặt</strong><p>Tạo mẫu tham chiếu với sự đồng ý của bạn.</p></div><span :class="face?.enrolled ? 'check done' : 'check'">{{ face?.enrolled ? '✓' : '→' }}</span></div><div><span class="timeline-index">2</span><div><strong>So khớp ảnh</strong><p>Kiểm tra ảnh mới với mẫu đã lưu.</p></div><span class="check">→</span></div><div><span class="timeline-index">3</span><div><strong>Xác minh người thật</strong><p>Đang chờ tích hợp PAD từ backend.</p></div><span class="check">○</span></div></div></section><section class="panel info-panel"><span class="info-symbol">✳</span><span class="eyebrow">LƯU Ý BẢO MẬT</span><h2>Quyền riêng tư<br />luôn là ưu tiên.</h2><p>Kết quả so khớp ảnh tĩnh chưa chứng minh người thật và không mở quyền xem hồ sơ. Mọi quyền truy cập được xác nhận bởi máy chủ.</p><RouterLink to="/settings/security">Quản lý dữ liệu của bạn ↗</RouterLink></section></div>
  </div>
</template>
