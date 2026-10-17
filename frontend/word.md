Triển khai frontend Vue 3 cho dự án CAPTCHA
Ngày lập: 17/10/2026. Repo: https://github.com/Thong1901/captcha
Tài liệu dựa trên mã nguồn nhánh main đã đọc tại commit f91100a. Đây là kế hoạch triển khai và ví dụ tích hợp, chưa phải frontend đã được tạo hoặc chạy thử. Khi backend thay đổi, kiểm tra lại request/response trước khi lập trình.
1. Quyết định tổ chức dự án
Tạo thư mục frontend/ ngang cấp với nitro-app/ trong cùng repository. Vue phụ trách giao diện; Nitro tiếp tục xử lý API, session, database, Redis và Face++. Không cần Nuxt.
Đường dẫn	Trách nhiệm
frontend/	Vue 3 + TypeScript + Vite + Vue Router + Pinia
nitro-app/server/	REST API và nghiệp vụ hiện tại
nitro-app/database/	Schema và migration
nitro-app/app/	Giao diện TypeScript cũ để tham khảo khi chuyển đổi
compose.yaml	Các dịch vụ Docker hiện tại


Giữ giao diện cũ trong giai đoạn chuyển đổi. Khi Vue đạt các luồng cần thiết, mới thay đổi build/deploy và gỡ mã cũ. Các thư mục components/pages/composables hiện có trong nitro-app không có nghĩa là dự án đã dùng Vue.
2. Những gì có thể triển khai ngay
Tính năng	Backend hiện tại	Việc của Vue
Google login	Có credential/session/logout API	Nút Google, khôi phục phiên, đăng xuất
Camera	Giao diện cũ có logic tham khảo	Component video, chụp JPEG, dừng camera
Đăng ký khuôn mặt	Có Face++ và consent header	Checkbox đồng ý, gửi JPEG, cập nhật trạng thái
So khớp khuôn mặt	Có so khớp ảnh tĩnh	Hiển thị matched, confidence, threshold
Xóa mẫu	Có DELETE API	Xác nhận xóa và cập nhật trạng thái
Hồ sơ quân nhân	Có API bảo vệ bằng access grant	Trang hồ sơ và xử lý 401/403/404
CAPTCHA	Có service challenge, chưa đủ API giải CAPTCHA	Chờ chốt hợp đồng backend rồi làm giao diện
PAD/liveness	Chưa tích hợp nhà cung cấp thực sự	Chưa thể hoàn thành xác minh mở quyền


So khớp Face++ thành công không đồng nghĩa xác thực người thật. API verify trả livenessVerified: false, không cấp quyền xem hồ sơ. Trang hồ sơ phải thông báo cần PAD khi nhận 403; không tự mở khóa bằng biến frontend.
3. Khởi tạo frontend
Trong PowerShell:
cd D:\products\captcha
pnpm create vue@latest
Chọn tên dự án frontend; bật TypeScript, Vue Router, Pinia, ESLint, Prettier. Có thể bật Vitest để kiểm thử logic phiên và trạng thái xác minh. Không cần JSX.
cd frontend
pnpm install
pnpm dev
Dùng Node.js đáp ứng yêu cầu mà create-vue/Vite thông báo; commit lockfile để cố định phiên bản đã cài. Không chạy git init riêng trong frontend; thư mục này thuộc repo captcha hiện tại.
4. Kết nối Vue với Nitro khi phát triển
Mô hình: trình duyệt mở http://localhost:5173; mọi lời gọi /api/... đi qua Vite proxy tới Nitro ở http://127.0.0.1:3000.
Sửa phần server trong frontend/vite.config.ts, giữ các plugin và alias mà create-vue sinh ra:
server: {
  port: 5173,
  strictPort: true,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
    },
  },
},
Backend kiểm tra header Origin bằng APP_ORIGIN. Vì trình duyệt mở Vue, đặt trong .env gốc dùng cho Compose:
APP_ORIGIN=http://localhost:5173
Giữ POSTGRES_PASSWORD, GOOGLE_CLIENT_ID, FACE_API_KEY, FACE_API_SECRET đang dùng. Áp dụng lại cấu hình:
cd D:\products\captcha
docker compose up -d --build --wait
Mở terminal thứ hai chạy Vue:
cd D:\products\captcha\frontend
pnpm dev
Trong Google Cloud, thêm http://localhost:5173 vào Authorized JavaScript origins của OAuth Web client. Frontend lấy client ID từ /api/auth/config. Không đưa Face++ secret vào biến VITE_ hoặc mã frontend.
Luôn truy cập bằng localhost:5173 trong cấu hình này; tránh đổi sang 127.0.0.1:5173. Dùng URL API tương đối /api, không gọi trực tiếp cổng 3000 từ trình duyệt. Vite proxy chỉ phục vụ phát triển, không thay thế reverse proxy production. Không rewrite Origin để vượt kiểm tra của backend.
5. Cấu trúc source đề xuất
Thư mục/file dưới frontend/src	Nội dung
main.ts, App.vue	Khởi tạo ứng dụng và layout
router/index.ts	Route, chờ khôi phục phiên, guard
stores/auth.ts	user, trạng thái tải, restore/login/logout
services/http.ts	Fetch chung và lỗi HTTP
services/auth.api.ts	API Google, session, logout
services/face.api.ts	API status/enroll/verify/delete
services/profile.api.ts	API challenge và hồ sơ
types/auth.ts, face.ts	DTO đã đối chiếu backend
composables/useCamera.ts	Stream, video, capture, cleanup
components/GoogleSignInButton.vue	Tích hợp Google Identity Services
components/FaceCamera.vue	Preview và chụp ảnh
components/ConsentCheckbox.vue	Đồng ý xử lý dữ liệu khuôn mặt
views/LoginView.vue	Đăng nhập
views/DashboardView.vue	Trạng thái phiên và khuôn mặt
views/FaceEnrollView.vue	Đăng ký mẫu
views/FaceCompareView.vue	So khớp ảnh tĩnh
views/MilitaryProfileView.vue	Hồ sơ được bảo vệ
views/SecuritySettingsView.vue	Xóa mẫu và đăng xuất


Tên FaceCompareView giúp giao diện phản ánh đúng khả năng hiện tại. Chỉ thêm luồng xác minh PAD khi backend đã có hợp đồng rõ ràng.
6. Hợp đồng API đã kiểm tra
Base URL từ phía Vue: /api. Session dùng cookie HttpOnly; không đọc cookie bằng JavaScript, không lưu token vào localStorage.
Method	Endpoint	Request / kết quả chính
GET	/auth/config	enabled, googleClientId, appOrigin
POST	/auth/google/credential	JSON { credential }; trả authenticated và user, đặt cookie
GET	/auth/session	{ authenticated, user }
POST	/auth/logout	Thu hồi session; sau thành công xóa state frontend
GET	/face/status	{ configured, enrolled }; cần đăng nhập
POST	/face/enroll	Body JPEG thô; Content-Type image/jpeg; x-face-consent: yes; trả { enrolled: true }
POST	/face/verify	Body JPEG thô; trả matched, confidence, threshold, livenessVerified
DELETE	/face/template	Thu hồi mẫu; gọi lại status để đồng bộ
POST	/challenges/profile	Trả challengeId, nonce, expiresAt; cần session và mẫu khuôn mặt
GET	/me/military-profile	Cần session và grant PAD hợp lệ; trả hồ sơ hoặc lỗi
GET	/me/military-profile/portrait	Ảnh riêng được bảo vệ; cần quyền tương ứng


Không gửi FormData hoặc base64 tới enroll/verify: backend hiện đọc body JPEG trực tiếp, tối đa 2.000.000 byte. Header Content-Type cần đúng image/jpeg.
API quản trị nằm dưới /api/admin/military-profiles. Trước khi làm CRUD quản trị, đọc từng handler để xác định URL, DTO, phân trang và quyền. Không suy đoán response hoặc tạo service cho endpoint chưa tồn tại. Lấy shape hồ sơ thực tế từ hàm publicProfile trong server/services/profiles/profile.ts.
7. Fetch dùng chung và ví dụ service
src/services/http.ts:
export class ApiError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`)
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) throw new ApiError(response.status)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}
Ví dụ types và service; đặt vào các file phù hợp:
import { api } from './http'

type User = { id: string; email: string; name: string | null }
type Session = { authenticated: boolean; user: User | null }
type FaceStatus = { configured: boolean; enrolled: boolean }
type FaceResult = {
  matched: boolean
  confidence: number
  threshold: number
  livenessVerified: boolean
}

export const getSession = () => api<Session>('/auth/session')
export const loginGoogle = (credential: string) => api<Session>(
  '/auth/google/credential', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  },
)
export const logout = () => api<unknown>('/auth/logout', { method: 'POST' })
export const getFaceStatus = () => api<FaceStatus>('/face/status')
export const enrollFace = (image: Blob) => api<{ enrolled: true }>('/face/enroll', {
  method: 'POST',
  headers: { 'Content-Type': 'image/jpeg', 'x-face-consent': 'yes' },
  body: image,
})
export const compareFace = (image: Blob) => api<FaceResult>('/face/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'image/jpeg' },
  body: image,
})
export const deleteFace = () => api<unknown>('/face/template', { method: 'DELETE' })
Consent phải do người dùng chủ động chọn trước khi gọi enrollFace. Không tự retry POST enroll/verify khi mất kết nối, vì kết quả phía server có thể đã được xử lý và Face++ có thể tính phí.
8. Các bước triển khai chức năng
Bước 1 — Khung ứng dụng và session
- Tạo các route /login, /dashboard, /face/enroll, /face/compare, /profile, /settings/security.
- Auth store có trạng thái unknown/loading/authenticated/anonymous; restore phiên một lần khi khởi động và chờ hoàn tất trong guard.
- GET session trả authenticated=false là kết quả hợp lệ, không phải lỗi mạng.
- Guard chuyển người chưa đăng nhập về /login. Guard chỉ điều hướng; backend vẫn quyết định quyền.
- Khi API trả 401, xóa user, hồ sơ, ảnh riêng và điều hướng về login.
Nghiệm thu: tải lại trang vẫn nhận phiên hiện có; không nháy nội dung hồ sơ trước khi kiểm tra session.
Bước 2 — Google login và logout
- GET /auth/config, kiểm tra enabled và appOrigin.
- Load script https://accounts.google.com/gsi/client một lần; render nút chính thức trong component.
- Google callback nhận credential, gửi POST credential; không tự giải mã token để quyết định đăng nhập.
- Lưu user vào bộ nhớ Pinia, không persist session token.
- Logout thành công: xóa state, hủy request đang chờ, dừng camera, thu hồi object URL ảnh.
Nghiệm thu: login thật, refresh và logout hoạt động; thiếu client ID có thông báo rõ; không dùng user giả để đánh dấu hoàn thành.
Bước 3 — Camera dùng chung
- Chỉ mở camera sau thao tác người dùng; dùng getUserMedia với video và audio=false.
- Gắn stream vào video có autoplay, muted, playsinline.
- Chờ video có kích thước trước khi vẽ lên canvas; có thể resize cạnh dài khoảng 960–1280 px.
- Chụp bằng canvas.toBlob với image/jpeg; kiểm tra Blob không null và kích thước <= 2.000.000 byte.
- Hiển thị lỗi bị từ chối quyền, không tìm thấy camera, camera đang bận.
- Khi rời trang, logout hoặc component unmount, gọi stop() cho mọi track, xóa srcObject và object URL.
- Camera hoạt động trên localhost hoặc HTTPS; thử từ điện thoại qua địa chỉ LAN cần HTTPS phù hợp.
Nghiệm thu: chụp/xem lại/chụp lại được; đèn camera tắt khi rời trang; không tự lưu ảnh vào localStorage.
Bước 4 — Đăng ký và xóa khuôn mặt
- Gọi /face/status; nếu configured=false, hiển thị dịch vụ chưa cấu hình.
- Nếu enrolled=true, hiển thị đã đăng ký và đường dẫn đến cài đặt xóa mẫu.
- Người dùng đọc nội dung đồng ý việc gửi ảnh đến Face++, đánh dấu checkbox rồi mới cho gửi ảnh.
- Gửi đúng JPEG và consent header; khóa nút trong lúc đang gửi.
- Sau thành công gọi lại status; xử lý 409 là mẫu đã tồn tại.
- Xóa mẫu cần hộp xác nhận; sau thành công xóa dữ liệu hồ sơ đang hiển thị vì backend cũng thu hồi access grant.
Nghiệm thu: không gửi khi chưa đồng ý; đăng ký và xóa phản ánh đúng trạng thái backend.
Bước 5 — So khớp khuôn mặt
- Chỉ cho so khớp khi đã có mẫu; gửi ảnh mới tới /face/verify.
- Hiển thị kết quả giống/không giống; confidence là điểm do nhà cung cấp trả, không diễn giải thành xác suất chắc chắn đúng danh tính.
- Luôn hiển thị rằng chưa có kiểm tra người thật khi livenessVerified=false.
- Không tạo grant, không đặt faceVerified=true để mở hồ sơ và không sửa điều kiện PAD phía backend.
Nghiệm thu: matched=true vẫn không được coi là đủ quyền truy cập hồ sơ.
Bước 6 — Hồ sơ và trạng thái bị khóa
- Trang /profile gọi API hồ sơ; 403 hiển thị cần xác minh người thật, 404 thông báo chưa có hồ sơ được liên kết.
- POST /challenges/profile tạo challenge là bước chuẩn bị; hiện chưa có endpoint hoàn tất PAD để dùng challenge này mở quyền.
- Không gửi challengeId/nonce vào API /face/verify hiện tại với kỳ vọng nó sẽ cấp grant; handler không hỗ trợ luồng đó.
- Sau này chỉ tải hồ sơ khi backend xác nhận grant; xóa dữ liệu khi hết hạn, logout hoặc nhận 401/403.
- Với ảnh portrait, dùng fetch có kiểm tra status rồi tạo object URL; revoke URL khi thay ảnh/rời trang. Không public hóa đường dẫn lưu trữ.
- Khi chưa có grant metadata trong response, không tự tính thời hạn từ kết quả matched. Backend cần bổ sung nguồn thời hạn chính thức trước khi làm countdown tin cậy.
Nghiệm thu hiện tại: giao diện bị khóa hoạt động đúng. Luồng xem hồ sơ thành công chỉ nghiệm thu sau khi backend PAD hoàn thiện.
9. Backend cần bổ sung để hoàn thành toàn bộ sản phẩm
Các mục dưới đây là công việc đề xuất, không phải endpoint đã tồn tại:
1. CAPTCHA: chốt loại thử thách, API tạo/lấy/giải, schema request/response, TTL, số lần thử, ràng buộc session và chống replay. Không trả đáp án cho frontend.
2. PAD: tích hợp provider/mô hình đã kiểm thử; chốt thu video hoặc chuỗi frame, giới hạn dung lượng, timeout và cách xác thực bằng chứng.
3. Xác minh bảo vệ hồ sơ: backend kiểm tra challenge/session/CAPTCHA nếu policy yêu cầu/PAD/face matching; ghi attempt tin cậy và cấp grant bằng luồng nhất quán chống race.
4. Metadata quyền: trả purpose, expiresAt và trạng thái quyền để frontend hiển thị; thông tin role/capability cho UI quản trị nếu cần.
5. Chuẩn hóa lỗi theo mã nghiệp vụ để phân biệt thiếu PAD, sai Origin, không có quyền và thiếu mẫu thay vì chỉ nhìn status 403.
Không cho frontend gửi padVerified: true làm bằng chứng. Các trường tin cậy phải do backend tạo từ kết quả provider.
10. Bảng xử lý lỗi
HTTP	Hành vi UI
400	Dữ liệu không hợp lệ; kiểm tra consent/ảnh
401	Hết phiên; xóa state nhạy cảm và đăng nhập lại
403	Không đủ quyền hoặc sai Origin; hiển thị theo ngữ cảnh, kiểm tra cấu hình khi mọi POST đều lỗi
404	Chưa có mẫu hoặc hồ sơ; không lặp gọi vô hạn
409	Đã tồn tại mẫu hoặc xung đột tài khoản
413	Ảnh quá lớn; giảm kích thước/chất lượng và chụp lại
415	Sai Content-Type; gửi JPEG thô
422	Chất lượng ảnh thấp hoặc không đúng một khuôn mặt
429	Quá nhiều yêu cầu; khóa gửi tạm thời, không tự spam retry
502/503	Dịch vụ Face++ lỗi hoặc chưa cấu hình


Backend hiện giới hạn nhóm yêu cầu face ở mức 6 lần/60 giây theo khóa người dùng; tránh polling face/status liên tục hoặc gửi ảnh theo từng frame.
11. Checklist kiểm thử và thứ tự giao việc
Đợt	Công việc	Điều kiện hoàn thành
1	Tạo frontend, proxy, cấu hình Origin	GET session và Google POST không bị sai Origin
2	Auth store, router, Google UI	Login/refresh/logout chạy với backend thật
3	Camera và đăng ký	Consent + JPEG đúng; camera được cleanup
4	So khớp và xóa mẫu	Kết quả đúng API; không mở quyền từ matched
5	Trang hồ sơ	Xử lý trạng thái khóa và dữ liệu riêng đúng
6	Backend CAPTCHA/PAD	Có hợp đồng và kiểm thử chống replay/giả mạo
7	UI CAPTCHA/PAD và grant	Luồng end-to-end được nghiệm thu với backend
8	Deployment	Build, routing, cookie, HTTPS và proxy hoạt động


Kiểm tra cần thiết: từ chối camera; ảnh nhiều khuôn mặt; 401 giữa luồng; 429; logout khi request hồ sơ đang chờ; xóa mẫu khi đang xem hồ sơ; refresh route trực tiếp. Dùng AbortController hoặc số thế hệ request để response cũ không khôi phục dữ liệu sau logout.
Chạy các script type-check, lint, test do scaffold thực tế cung cấp và pnpm build. Test frontend bằng response giả chỉ kiểm chứng UI; cần chạy thêm luồng tích hợp thật để kết luận API hoạt động. Không dùng dữ liệu quân nhân thật trong fixture.
12. Build và triển khai
cd D:\products\captcha\frontend
pnpm build
Kết quả Vue nằm trong frontend/dist. Compose hiện tại chỉ build nitro-app nên chưa tự phục vụ thư mục này.
Phương án production đề xuất: reverse proxy phục vụ Vue dist, chuyển /api tới Nitro và fallback các route frontend về index.html. Đặt cả frontend/API dưới cùng HTTPS origin. Sửa APP_ORIGIN thành domain production và cập nhật Google Authorized JavaScript origins. Proxy phải giữ Origin thật của trình duyệt. Không cache API session, hồ sơ hoặc portrait; tránh cache public dữ liệu riêng. Chỉ các route frontend mới fallback index.html, API phải giữ nguyên lỗi JSON/status.
Cần bổ sung Dockerfile frontend và service reverse proxy trong một công việc riêng; sau đó kiểm tra lại build context, port và volume. Không coi pnpm build là đã triển khai lên Docker.
13. Tham chiếu
- Vue scaffold chính thức: https://vuejs.org/guide/quick-start.html
- Repo và API: https://github.com/Thong1901/captcha/tree/f91100a48c283ba95fa86f6fc62fa377648de58a
- Hướng dẫn backend: nitro-app/README.md
- Giao diện cũ để chuyển đổi: nitro-app/app/app.ts, face-camera.ts, profile-area.ts
- Chính sách quyền: nitro-app/server/services/profiles/access.ts
- Kiểu ảnh được chấp nhận: nitro-app/server/services/face/request.ts
Ưu tiên bắt đầu đợt 1–2, sau đó camera/Face++; phát triển backend PAD song song với giai đoạn UI bị khóa, nhưng chỉ nghiệm thu quyền truy cập khi backend đủ điều kiện.