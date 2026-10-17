<script setup lang="ts">
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
</script>

<template>
  <main class="login-layout">
    <div class="login-art"><div class="login-brand"><span class="brand-mark">◈</span> sentinel</div><div class="login-orbit"><div class="orbit one"></div><div class="orbit two"></div><div class="orbit three"></div><span>◈</span></div><div class="art-copy"><span class="eyebrow">AN TOÀN · RIÊNG TƯ · MINH BẠCH</span><h2>Một lớp bảo vệ<br />cho danh tính của bạn.</h2><p>Xác thực tài khoản và quản lý dữ liệu khuôn mặt trong một không gian đáng tin cậy.</p></div></div>
    <div class="login-form-wrap"><div class="login-form"><span class="login-kicker">CHÀO MỪNG ĐẾN SENTINEL</span><h1>Đăng nhập để<br /><em>bắt đầu.</em></h1><p>Sử dụng tài khoản Google để truy cập không gian xác thực của bạn.</p><GoogleSignInButton /><div class="login-divider"><span>TRUY CẬP AN TOÀN</span></div><div class="login-perks"><div><span>♙</span><div><strong>Phiên đăng nhập bảo mật</strong><small>Không lưu token trong trình duyệt.</small></div></div><div><span>◈</span><div><strong>Quyền truy cập được kiểm soát</strong><small>Backend xác quyết quyền xem hồ sơ.</small></div></div></div></div><div class="login-footer">© 2026 Sentinel Identity Platform</div></div>
  </main>
</template>
