# Sentinel frontend (Vue 3)

Giao diện Vue 3 + TypeScript + Vite cho Nitro API trong `../nitro-app`. `word.md` mô tả hợp đồng và thứ tự triển khai.

## Chạy local

```powershell
cd D:\products\captcha\frontend
pnpm install
pnpm dev
```

Mở `http://localhost:5173`. Vite chuyển `/api` tới Nitro tại `http://127.0.0.1:3000` và giữ Origin của trình duyệt.

Để Google login và các API ghi hoạt động, cấu hình `APP_ORIGIN=http://localhost:5173` trong `.env` ở **gốc repository**, rồi khởi động lại Nitro/Compose. Thêm `http://localhost:5173` vào Authorized JavaScript origins của Google OAuth. Client ID được lấy từ `/api/auth/config`; không đặt Face++ secret trong frontend.

## Kiểm tra

```powershell
pnpm type-check
pnpm lint
pnpm build
```

Build tạo `dist/`. Cấu hình Compose hiện tại chưa phục vụ thư mục này; production cần reverse proxy chung origin cho Vue và `/api`.

## Giới hạn hiện tại

- So khớp ảnh tĩnh trả `livenessVerified: false`; không cấp quyền xem hồ sơ.
- Hồ sơ chỉ hiển thị khi backend trả quyền hợp lệ từ `/auth/access-status`. UI hiển thị trạng thái khóa khi chưa có PAD.
- CAPTCHA và PAD chưa có hợp đồng API hoàn chỉnh nên chưa có thao tác giải/xác minh trên giao diện.
