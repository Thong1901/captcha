# TÀI LIỆU THIẾT KẾ VÀ TRIỂN KHAI ỨNG DỤNG CAPTCHA KẾT HỢP XÁC THỰC KHUÔN MẶT

## 1. Tổng quan dự án

### 1.1. Mục tiêu

Xây dựng ứng dụng web có khả năng:

- Đăng nhập bằng tài khoản Google.
- Đăng ký khuôn mặt sau khi người dùng đăng nhập thành công.
- Sử dụng CAPTCHA để hạn chế bot và hành vi tự động hóa.
- Xác minh khuôn mặt khi người dùng đăng nhập hoặc thực hiện hành động cần bảo vệ.
- Phát hiện các hình thức giả mạo như ảnh in, video phát lại và một số hình thức giả mạo khuôn mặt khác.
- Quản lý phiên đăng nhập, dữ liệu sinh trắc học và nhật ký bảo mật.
- Triển khai bằng Docker, thuận tiện cho phát triển, kiểm thử và vận hành.

### 1.2. Phạm vi phiên bản đầu tiên

Phiên bản đầu tiên bao gồm:

1. Đăng nhập Google.
2. Quản lý tài khoản và phiên.
3. Đăng ký khuôn mặt.
4. CAPTCHA và quản lý challenge.
5. Xác thực khuôn mặt.
6. Kiểm tra PAD/liveness.
7. Quản lý cơ sở dữ liệu.
8. Ghi nhật ký bảo mật.
9. Docker hóa hệ thống.
10. Kiểm thử và triển khai HTTPS.

### 1.3. Nguyên tắc thiết kế

- Backend là nơi quyết định kết quả xác thực.
- Không tin tưởng dữ liệu trạng thái do frontend tự gửi.
- Không lưu mật khẩu Google hoặc yêu cầu người dùng cung cấp mật khẩu Google cho ứng dụng.
- Không lưu ảnh/video khuôn mặt lâu hơn thời gian thực sự cần thiết.
- Không xem kiểm tra chớp mắt hoặc quay đầu là giải pháp chống giả mạo hoàn chỉnh.
- Không cấp quyền chỉ vì Google đăng nhập thành công nếu nghiệp vụ yêu cầu thêm xác minh khuôn mặt.
- Luôn có phương án khôi phục tài khoản và xác thực thay thế.
- Mọi dữ liệu truyền trong môi trường thực tế phải được bảo vệ bằng HTTPS.

---

## 2. Kiến trúc công nghệ

### 2.1. Danh sách công nghệ

| Thành phần | Công nghệ đề xuất | Nhiệm vụ |
|---|---|---|
| Frontend | Vue 3 hoặc Nuxt | Giao diện, camera, CAPTCHA |
| Backend | Nitro + TypeScript | API và nghiệp vụ xác thực |
| Đăng nhập | Google OpenID Connect | Xác minh tài khoản Google |
| Session | Cookie HttpOnly + Redis/PostgreSQL | Duy trì phiên |
| Database | PostgreSQL | Lưu dữ liệu nghiệp vụ |
| ORM | Drizzle ORM | Truy vấn và migration |
| Rate limiting | Redis | Hạn chế yêu cầu và chống replay |
| Face detection | MediaPipe hoặc mô hình tương đương | Phát hiện khuôn mặt |
| Face matching | Mô hình nhận dạng khuôn mặt phù hợp | So sánh mẫu sinh trắc học |
| PAD | Mô hình phát hiện tấn công trình diện chuyên dụng | Phát hiện giả mạo |
| AI service | Python + FastAPI | Xử lý ảnh/video và mô hình AI |
| Container | Docker + Docker Compose | Đóng gói dịch vụ |
| Reverse proxy | Caddy hoặc Nginx | HTTPS và chuyển tiếp request |
| Kiểm thử API | Vitest và công cụ kiểm thử HTTP | Kiểm thử nghiệp vụ |
| Kiểm thử bảo mật | OWASP ZAP và kiểm thử thủ công | Phát hiện lỗ hổng |

### 2.2. Sơ đồ kiến trúc

Người dùng → Frontend → Nitro API → Dịch vụ AI.

Nitro API kết nối PostgreSQL và Redis. Google là nhà cung cấp danh tính bên ngoài, được sử dụng trong quy trình đăng nhập. Reverse proxy đứng trước các dịch vụ được phép truy cập từ Internet.

Không cho trình duyệt gọi trực tiếp dịch vụ AI nội bộ hoặc kết nối thẳng tới PostgreSQL và Redis.

---

## 3. Module 1 — Đăng nhập bằng Google

### 3.1. Công nghệ

- Google Identity Services.
- OAuth 2.0 và OpenID Connect (OIDC).
- Nitro server routes.
- Thư viện xác minh ID token phía server.
- PostgreSQL và Drizzle ORM.
- Cookie session bảo mật.

Tài liệu chính thức:

https://developers.google.com/identity/openid-connect/openid-connect

### 3.2. Nguyên tắc hoạt động

Google đăng nhập giúp xác minh người dùng kiểm soát tài khoản Google. Ứng dụng không nhận mật khẩu Google.

Luồng đề xuất:

1. Người dùng nhấn nút “Đăng nhập bằng Google”.
2. Frontend khởi tạo quy trình Google Sign-In.
3. Google yêu cầu người dùng đăng nhập hoặc chọn tài khoản.
4. Google trả về thông tin xác thực theo luồng đã cấu hình.
5. Nitro xác minh token hoặc mã ủy quyền ở phía server.
6. Nitro kiểm tra chữ ký, issuer, audience, thời hạn và các điều kiện cần thiết.
7. Lấy `sub` làm định danh Google ổn định.
8. Tìm tài khoản tương ứng trong database.
9. Tạo tài khoản mới nếu chính sách đăng ký cho phép.
10. Tạo session mới với ID ngẫu nhiên.
11. Gửi cookie session cho trình duyệt.
12. Chuyển người dùng tới màn hình chính hoặc bước xác minh khuôn mặt tiếp theo.

### 3.3. Tạo Google OAuth Client

Thực hiện trên Google Cloud Console:

1. Tạo một Google Cloud project.
2. Cấu hình OAuth consent screen hoặc màn hình xác thực tương ứng với giao diện hiện tại của Google.
3. Khai báo tên ứng dụng và thông tin liên hệ.
4. Khai báo các domain được phép.
5. Tạo OAuth Client ID cho ứng dụng web.
6. Cấu hình origin và redirect URI chính xác theo phương thức đăng nhập đã chọn.
7. Lưu Client ID vào cấu hình frontend hoặc server theo đúng vai trò.
8. Lưu Client Secret ở server nếu sử dụng luồng cần bí mật này.
9. Kiểm tra trên môi trường local trước khi triển khai production.

Không đưa Client Secret vào mã frontend, repository công khai hoặc image Docker.

### 3.4. Endpoint đề xuất

- `GET /api/auth/google/start`: bắt đầu luồng đăng nhập nếu sử dụng redirect flow.
- `GET /api/auth/google/callback`: nhận callback và xác minh kết quả.
- `POST /api/auth/google/credential`: nhận credential từ Google Identity Services nếu chọn phương thức này.
- `GET /api/auth/session`: lấy trạng thái đăng nhập.
- `POST /api/auth/logout`: đăng xuất.

Hai cách nhận kết quả Google là các lựa chọn triển khai khác nhau. Không cần xây dựng đồng thời cả hai nếu chưa có yêu cầu cụ thể.

### 3.5. Các trường dữ liệu cần xử lý

- `sub`: định danh người dùng tại Google.
- `email`: địa chỉ email.
- `email_verified`: trạng thái xác minh email.
- `name`: tên hiển thị nếu được cung cấp.
- `picture`: ảnh đại diện nếu được cung cấp.

Không dùng email làm định danh duy nhất của nhà cung cấp. Nên dùng kết hợp `provider = google` và `provider_subject = sub`.

Nếu email Google trùng với một tài khoản đã đăng ký bằng phương thức khác, không tự động liên kết hai tài khoản nếu chưa có quy trình xác minh quyền sở hữu an toàn.

### 3.6. Bảo mật

- Kiểm tra `state` trong luồng redirect.
- Kiểm tra `nonce` khi áp dụng theo luồng OIDC.
- Kiểm tra audience, issuer, chữ ký và thời hạn token.
- Chỉ chấp nhận redirect URI đã đăng ký.
- Không tin email hoặc tên do frontend tự gửi.
- Không dùng Google access token như session của ứng dụng.
- Sau khi đăng nhập thành công, tạo session riêng của ứng dụng.
- Sử dụng cookie `Secure`, `HttpOnly`, `SameSite` phù hợp.
- Bảo vệ các request thay đổi trạng thái khỏi CSRF.
- Không ghi token hoặc mã xác thực vào log.

### 3.7. Tiêu chí nghiệm thu

- Đăng nhập Google thành công.
- Token không hợp lệ bị từ chối.
- Token hết hạn bị từ chối.
- Token dành cho ứng dụng khác bị từ chối.
- Callback sai `state` bị từ chối.
- Người dùng không thể giả mạo `sub` bằng cách gửi request thông thường.
- Session mới được cấp sau khi xác minh thành công.
- Đăng xuất làm mất hiệu lực session phía server.

---

## 4. Module 2 — Quản lý người dùng và session

### 4.1. Công nghệ

- Nitro middleware.
- PostgreSQL.
- Drizzle ORM.
- Redis hoặc bảng session trong PostgreSQL.
- Cookie HttpOnly.

### 4.2. Nhiệm vụ

- Quản lý người dùng.
- Duy trì trạng thái đăng nhập.
- Phân biệt session chưa đăng nhập và session đã xác thực.
- Thu hồi session khi đăng xuất.
- Hỗ trợ khóa tài khoản hoặc thu hồi session khi phát hiện nguy cơ.

### 4.3. Cấu trúc dữ liệu

Bảng `users`:

- `id`
- `display_name`
- `status`
- `created_at`
- `updated_at`

Bảng `auth_identities`:

- `id`
- `user_id`
- `provider`
- `provider_subject`
- `email`
- `email_verified`
- `created_at`

Bảng `sessions` nếu lưu trong PostgreSQL:

- `id`
- `user_id`
- `session_token_hash`
- `authenticated_at`
- `expires_at`
- `revoked_at`
- `created_at`

Session ID nguyên bản chỉ được gửi cho client qua cookie. Server lưu hash của session token nếu sử dụng mô hình này.

### 4.4. Quy trình xử lý

1. Google xác minh danh tính.
2. Nitro tìm hoặc tạo tài khoản nội bộ.
3. Tạo session ID ngẫu nhiên bằng bộ sinh số ngẫu nhiên mật mã.
4. Lưu hash session vào database hoặc lưu session trong Redis.
5. Gửi cookie session.
6. Middleware kiểm tra session cho các request được bảo vệ.
7. Khi đăng xuất, thu hồi session và xóa cookie.

Nếu xác minh khuôn mặt là điều kiện bắt buộc, session sau Google đăng nhập chỉ có quyền truy cập các endpoint cần thiết để hoàn thành xác minh. Chỉ sau khi quy trình xác minh thành công, server mới nâng trạng thái xác thực.

### 4.5. Tiêu chí nghiệm thu

- Session không thể đoán được.
- Session hết hạn bị từ chối.
- Session đã thu hồi không thể dùng lại.
- Đăng nhập thành công không tự động bỏ qua bước xác minh khuôn mặt bắt buộc.
- Người dùng không thể truy cập dữ liệu của tài khoản khác bằng cách thay đổi ID trong request.

---

## 5. Module 3 — CAPTCHA và Challenge Management

### 5.1. Công nghệ

- Nitro REST API.
- Redis.
- Bộ sinh số ngẫu nhiên mật mã.
- Schema validation bằng thư viện như Zod.
- CAPTCHA bên thứ ba hoặc thử thách tương tác do ứng dụng thiết kế.

### 5.2. Nhiệm vụ

- Tạo challenge.
- Ràng buộc challenge với session và mục đích.
- Kiểm tra kết quả CAPTCHA.
- Hạn chế số lần thử.
- Chống sử dụng lại challenge.
- Quản lý thời hạn và trạng thái.

### 5.3. Quy trình

1. Client yêu cầu challenge.
2. Server tạo ID và nonce ngẫu nhiên.
3. Server lưu trạng thái challenge cùng thời hạn.
4. Client thực hiện CAPTCHA.
5. Server tự kiểm tra kết quả.
6. Server đánh dấu challenge đã được tiêu thụ hoặc xác minh.
7. Chỉ cho phép bước tiếp theo khi challenge hợp lệ.

Nếu sử dụng CAPTCHA của bên thứ ba, server phải xác minh token với nhà cung cấp. Không chỉ kiểm tra một giá trị boolean do frontend gửi.

### 5.4. Endpoint

- `POST /api/challenges`
- `GET /api/challenges/:id`
- `POST /api/challenges/:id/captcha`

### 5.5. Tiêu chí nghiệm thu

- Challenge hết hạn không được chấp nhận.
- Challenge đã sử dụng không thể dùng lại.
- Challenge thuộc session khác bị từ chối.
- Request vượt giới hạn bị chặn.
- Client không thể tự đánh dấu CAPTCHA thành công.

---

## 6. Module 4 — Đăng ký khuôn mặt

### 6.1. Công nghệ

- Web Camera API.
- HTTPS.
- Face detection.
- Mô hình face embedding.
- Python service.
- PostgreSQL.
- Mã hóa dữ liệu sinh trắc học.

### 6.2. Điều kiện đăng ký

- Người dùng đã đăng nhập Google.
- Tài khoản đủ điều kiện đăng ký.
- Người dùng được thông báo rõ về việc thu thập dữ liệu sinh trắc học.
- Người dùng đồng ý theo cơ chế phù hợp.
- Challenge đăng ký hợp lệ.
- Kết quả PAD đáp ứng chính sách.
- Chất lượng dữ liệu đủ để tạo mẫu tham chiếu.

### 6.3. Quy trình

1. Người dùng chọn đăng ký khuôn mặt.
2. Server tạo challenge đăng ký.
3. Trình duyệt xin quyền camera.
4. Người dùng thực hiện thử thách.
5. Dữ liệu được gửi qua HTTPS.
6. AI service kiểm tra định dạng và chất lượng dữ liệu.
7. AI service thực hiện PAD.
8. Nếu đạt yêu cầu, hệ thống tạo embedding.
9. Server mã hóa mẫu trước khi lưu.
10. Database lưu mẫu cùng phiên bản mô hình và thời gian tạo.
11. Server trả trạng thái hoàn tất.
12. Dữ liệu tạm được xóa theo chính sách.

### 6.4. Thiết kế bảng

Bảng `biometric_templates`:

- `id`
- `user_id`
- `encrypted_template`
- `encryption_key_version`
- `model_name`
- `model_version`
- `created_at`
- `revoked_at`

Cần có chính sách số lượng mẫu trên mỗi tài khoản, phiên bản mô hình và quy trình cập nhật mẫu khi thay đổi mô hình.

### 6.5. Bảo mật

- Không cho phép đăng ký mẫu cho tài khoản chưa xác minh.
- Không lưu ảnh gốc lâu dài nếu không cần.
- Mã hóa embedding bằng khóa quản lý riêng.
- Không lưu khóa mã hóa cùng database.
- Giới hạn quyền đọc mẫu.
- Có quy trình xóa mẫu.
- Có quy trình xử lý khi tài khoản bị chiếm quyền.
- Không coi embedding là dữ liệu vô hại; embedding vẫn có thể mang rủi ro riêng tư.

---

## 7. Module 5 — Xác thực khuôn mặt

### 7.1. Công nghệ

- Face detection.
- Face embedding.
- Face similarity matching.
- AI service.
- Nitro policy engine.
- PostgreSQL và Redis.

### 7.2. Quy trình

1. Người dùng đăng nhập Google.
2. Server xác định tài khoản và chính sách xác thực.
3. Server tạo challenge mới.
4. Client thu thập dữ liệu camera.
5. Server kiểm tra challenge và dữ liệu đầu vào.
6. AI service phát hiện khuôn mặt.
7. AI service kiểm tra chất lượng.
8. AI service đánh giá PAD.
9. Nếu PAD đạt yêu cầu, AI service tạo embedding.
10. So sánh embedding với mẫu đã đăng ký.
11. Nitro nhận kết quả có nguồn gốc đáng tin cậy.
12. Policy engine đưa ra quyết định cuối cùng.
13. Nếu đạt yêu cầu, server nâng trạng thái xác thực.
14. Nếu không đạt, server từ chối hoặc yêu cầu phương thức dự phòng.

### 7.3. Quy tắc quyết định

Không nên sử dụng duy nhất điểm similarity để cấp quyền.

Quyết định cần xét:

- Trạng thái session.
- Tính hợp lệ của challenge.
- Kết quả CAPTCHA.
- Kết quả PAD.
- Kết quả face matching.
- Số lần thử.
- Tình trạng tài khoản.
- Mức độ rủi ro của hành động.

Ngưỡng so khớp phải được hiệu chỉnh bằng dữ liệu đánh giá phù hợp và xác nhận trước khi triển khai thực tế.

### 7.4. Tiêu chí nghiệm thu

- Khuôn mặt không khớp bị từ chối.
- Challenge không hợp lệ bị từ chối.
- Dữ liệu không đủ chất lượng không được tự động chấp nhận.
- Kết quả AI của request khác không thể được dùng lại.
- Các lần thử thất bại được giới hạn.
- Có phương án xác thực dự phòng.

---

## 8. Module 6 — Liveness và PAD

### 8.1. Công nghệ

- Mô hình PAD chuyên dụng.
- Phân tích chuỗi ảnh/video.
- Challenge ngẫu nhiên.
- Python AI service.
- Bộ kiểm thử tấn công trình diện.

### 8.2. Các kiểu tấn công cần xem xét

- Ảnh in.
- Ảnh hiển thị trên màn hình.
- Video phát lại.
- Video được chuẩn bị trước để phù hợp với một thử thách cố định.
- Một số dạng giả mạo tổng hợp hoặc deepfake.
- Dữ liệu bị thay thế trong quá trình gửi lên server.

### 8.3. Thiết kế

1. Server sinh challenge có thời hạn.
2. Client thực hiện challenge qua camera.
3. Server kiểm tra tính hợp lệ của challenge.
4. AI service phân tích chuỗi dữ liệu.
5. PAD trả về kết quả theo chính sách.
6. Backend chỉ tiếp tục face matching khi điều kiện PAD được đáp ứng.
7. Kết quả được liên kết với challenge và request hiện tại.

Chớp mắt, quay đầu hoặc thay đổi biểu cảm có thể được dùng làm thử thách tương tác, nhưng không đủ để chứng minh người dùng là người thật. Cần mô hình PAD được đánh giá với các kiểu tấn công thực tế.

### 8.4. Kiểm thử

- Thử bằng người thật với nhiều điều kiện ánh sáng.
- Thử bằng ảnh in.
- Thử bằng video phát lại.
- Thử bằng màn hình hiển thị khuôn mặt.
- Thử dữ liệu sai định dạng.
- Thử request bị gửi lại.
- Đánh giá tỷ lệ chấp nhận nhầm và từ chối nhầm.

---

## 9. Module 7 — AI Service

### 9.1. Công nghệ

- Python.
- FastAPI.
- Mô hình phát hiện và nhận dạng khuôn mặt.
- Mô hình PAD.
- Docker.
- API nội bộ được xác thực.

### 9.2. Trách nhiệm

AI service chỉ thực hiện xử lý AI. Nitro vẫn chịu trách nhiệm về tài khoản, session, challenge và quyết định cấp quyền.

### 9.3. Các endpoint nội bộ

- `POST /internal/face/enroll`
- `POST /internal/face/verify`
- `POST /internal/pad/evaluate`
- `GET /internal/health`

Không công khai các endpoint nội bộ ra Internet.

### 9.4. Yêu cầu

- Xác thực request từ Nitro.
- Giới hạn thời gian xử lý.
- Giới hạn kích thước dữ liệu.
- Kiểm tra MIME type và nội dung thực tế.
- Không tải trực tiếp tệp tùy ý từ URL do client cung cấp.
- Không trả embedding hoặc dữ liệu nhạy cảm cho trình duyệt.
- Ghi nhận phiên bản mô hình.
- Có thể thay mô hình mà không phải viết lại toàn bộ nghiệp vụ Nitro.

---

## 10. Module 8 — PostgreSQL và Drizzle ORM

### 10.1. Công nghệ

- PostgreSQL.
- Drizzle ORM.
- Drizzle Kit.
- Migration theo phiên bản.
- Transaction.

### 10.2. Các bảng

1. `users`
2. `auth_identities`
3. `sessions`
4. `biometric_templates`
5. `verification_challenges`
6. `verification_attempts`
7. `audit_events`

### 10.3. Quy trình triển khai

1. Khai báo schema bằng TypeScript.
2. Khai báo khóa chính, khóa ngoại và unique constraints.
3. Tạo migration.
4. Kiểm tra migration trong môi trường phát triển.
5. Áp dụng migration trong môi trường staging.
6. Kiểm tra backup và khả năng phục hồi.
7. Chỉ áp dụng migration production theo quy trình phát hành.

Dùng migration có quản lý thay vì tự động thay đổi cấu trúc database trong mỗi lần khởi động ứng dụng production.

### 10.4. Yêu cầu

- Dùng parameterized queries thông qua ORM.
- Dùng transaction khi chuyển trạng thái challenge.
- Đảm bảo challenge không thể được tiêu thụ hai lần.
- Không cấp quyền database rộng hơn nhu cầu.
- Tách tài khoản migration và tài khoản chạy ứng dụng nếu phù hợp.
- Backup định kỳ và kiểm tra khả năng restore.

---

## 11. Module 9 — Frontend và camera

### 11.1. Công nghệ

- Vue 3 hoặc Nuxt.
- TypeScript.
- Web Camera API.
- HTTPS.
- Schema validation.
- UI trạng thái xác thực.

### 11.2. Các màn hình

- Đăng nhập Google.
- Trang chủ.
- Đăng ký khuôn mặt.
- Xác minh khuôn mặt.
- Kết quả xác thực.
- Cài đặt bảo mật.
- Xóa mẫu khuôn mặt.
- Phương thức xác thực dự phòng.

### 11.3. Yêu cầu UX

- Thông báo lý do yêu cầu camera.
- Hiển thị trạng thái xin quyền camera.
- Cho phép dừng camera.
- Hiển thị hướng dẫn khi ánh sáng không đủ.
- Hỗ trợ máy tính và điện thoại.
- Có thông báo khi phiên hết hạn.
- Có phương án khi camera không hoạt động.
- Không hiển thị thông tin nội bộ về ngưỡng PAD hoặc mẫu sinh trắc học.

---

## 12. Module 10 — Docker và triển khai

### 12.1. Công nghệ

- Docker.
- Docker Compose.
- PostgreSQL.
- Redis.
- Nitro.
- FastAPI.
- Caddy hoặc Nginx.

### 12.2. Các container

- `api`
- `face-ai`
- `postgres`
- `redis`
- `proxy`

### 12.3. Quy trình

1. Viết Dockerfile riêng cho Nitro.
2. Viết Dockerfile riêng cho AI service.
3. Khai báo các service trong Compose.
4. Sử dụng named volumes cho dữ liệu cần giữ.
5. Cấu hình network nội bộ.
6. Không công khai cổng PostgreSQL và Redis.
7. Cấu hình HTTPS tại reverse proxy.
8. Cấp secrets qua môi trường triển khai an toàn.
9. Cấu hình health checks.
10. Chạy migration.
11. Kiểm thử toàn bộ luồng.
12. Thiết lập backup, logging và giám sát.

### 12.4. Yêu cầu production

- Image được ghim phiên bản.
- Không chạy container với quyền cao không cần thiết.
- Có chính sách cập nhật bảo mật.
- Có giới hạn tài nguyên.
- Có giám sát lỗi và thời gian phản hồi.
- Có quy trình khôi phục database.
- Có quy trình xóa dữ liệu sinh trắc học.
- Không ghi secrets vào log.

---

## 13. Thiết kế API tổng thể

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/auth/google/start` | Bắt đầu Google login nếu dùng redirect |
| GET | `/api/auth/google/callback` | Xử lý callback Google |
| POST | `/api/auth/google/credential` | Nhận credential nếu dùng Google Identity Services |
| GET | `/api/auth/session` | Kiểm tra session |
| POST | `/api/auth/logout` | Đăng xuất |
| POST | `/api/challenges` | Tạo challenge |
| GET | `/api/challenges/:id` | Kiểm tra trạng thái challenge |
| POST | `/api/challenges/:id/captcha` | Xác minh CAPTCHA |
| POST | `/api/biometrics/enroll` | Đăng ký khuôn mặt |
| POST | `/api/biometrics/verify` | Xác minh khuôn mặt |
| DELETE | `/api/biometrics/template` | Xóa mẫu khuôn mặt |
| GET | `/api/health` | Kiểm tra tình trạng dịch vụ |

Tất cả endpoint phải có schema validation, giới hạn request và xử lý lỗi thống nhất. Endpoint sinh trắc học cần có cơ chế xác thực và phân quyền riêng.

---

## 14. Bảo mật và quyền riêng tư

### 14.1. Xác thực

- Xác minh Google token tại server.
- Quản lý session riêng.
- Dùng cookie bảo mật.
- Bảo vệ CSRF.
- Giới hạn số lần thử.
- Có quy trình thu hồi session.
- Có phương thức xác thực dự phòng.

### 14.2. Sinh trắc học

- Thông báo rõ mục đích thu thập.
- Chỉ thu thập dữ liệu cần thiết.
- Mã hóa dữ liệu lưu trữ.
- Quản lý khóa riêng.
- Giới hạn quyền truy cập.
- Xóa dữ liệu khi hết mục đích lưu trữ.
- Không lưu ảnh/video lâu dài để tiện debug.
- Đánh giá yêu cầu pháp lý và quyền của người dùng.

### 14.3. Chống tấn công

- Chống replay bằng challenge dùng một lần.
- Rate limiting.
- Kiểm tra dữ liệu đầu vào.
- Kiểm soát truy cập nội bộ.
- Bảo vệ API AI.
- Kiểm thử IDOR và phân quyền.
- Không tiết lộ lý do từ chối quá chi tiết cho người không có quyền.
- Kiểm thử các trường hợp giả mạo đã xác định.

---

## 15. Kế hoạch phát triển theo giai đoạn

### Giai đoạn 1 — Nền tảng

- Khởi tạo repository.
- Khởi tạo Nitro.
- Cấu hình PostgreSQL và Drizzle.
- Tạo migration.
- Cấu hình Docker.
- Tạo health endpoint.

Kết quả: ứng dụng chạy được trong Docker và kết nối database.

### Giai đoạn 2 — Google login

- Tạo Google OAuth Client.
- Tích hợp OIDC.
- Xác minh token phía server.
- Tạo bảng identity.
- Tạo session.
- Xây dựng logout.
- Kiểm thử các tình huống token không hợp lệ.

Kết quả: người dùng có thể đăng nhập Google an toàn.

### Giai đoạn 3 — CAPTCHA và challenge

- Tạo challenge.
- Tích hợp CAPTCHA.
- Thêm Redis.
- Thêm thời hạn và trạng thái.
- Chống replay.
- Thêm rate limit.

Kết quả: challenge được xác minh tại server và không thể sử dụng lại.

### Giai đoạn 4 — Đăng ký khuôn mặt

- Xây dựng giao diện camera.
- Tích hợp AI service.
- Kiểm tra chất lượng dữ liệu.
- Tạo embedding.
- Mã hóa và lưu mẫu.
- Xây dựng xóa mẫu.

Kết quả: tài khoản có thể đăng ký và thu hồi mẫu khuôn mặt.

### Giai đoạn 5 — Xác thực và PAD

- Xây dựng luồng face matching.
- Tích hợp PAD.
- Kiểm tra dữ liệu gắn với challenge.
- Xây dựng policy engine.
- Thêm xác thực dự phòng.
- Kiểm thử các tình huống giả mạo.

Kết quả: hệ thống có thể đánh giá khuôn mặt theo chính sách xác thực.

### Giai đoạn 6 — Staging và production

- Cấu hình HTTPS.
- Kiểm thử bảo mật.
- Kiểm thử tải.
- Thiết lập logging.
- Thiết lập backup.
- Kiểm tra restore.
- Đánh giá quyền riêng tư.
- Kiểm thử quy trình xóa dữ liệu.
- Phát hành theo từng đợt.

Kết quả: hệ thống sẵn sàng cho thử nghiệm thực tế có kiểm soát.

---

## 16. Tiêu chí nghiệm thu tổng thể

Dự án chỉ được xem là hoàn thành khi:

1. Đăng nhập Google hoạt động và token không hợp lệ bị từ chối.
2. Session được tạo, hết hạn và thu hồi đúng quy trình.
3. CAPTCHA được xác minh tại backend.
4. Challenge hết hạn hoặc đã dùng không thể tái sử dụng.
5. Khuôn mặt được so sánh với mẫu tham chiếu hợp lệ.
6. PAD được đánh giá trên các kiểu tấn công mục tiêu.
7. Dữ liệu sinh trắc học được bảo vệ và có thể xóa.
8. Rate limiting hoạt động.
9. PostgreSQL và Redis không bị công khai trực tiếp ra Internet.
10. Docker Compose có thể khởi chạy toàn bộ dịch vụ.
11. Có bộ kiểm thử tự động cho các luồng thành công và thất bại.
12. Có phương án xác thực thay thế khi camera hoặc xác minh khuôn mặt thất bại.
13. Có tài liệu vận hành, backup, restore và xử lý sự cố.
14. Có quy trình đánh giá bảo mật trước khi triển khai công khai.

---

## 17. Tài liệu tham khảo chính thức

- Google OpenID Connect: https://developers.google.com/identity/openid-connect/openid-connect
- Google Identity Services: https://developers.google.com/identity/gsi/web
- Nitro: https://nitro.build/docs
- Drizzle ORM và PostgreSQL: https://orm.drizzle.team/docs/get-started/postgresql-new
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- NIST Digital Identity Guidelines: https://pages.nist.gov/800-63-4/sp800-63b/authenticators/

## 18. Kết luận

Giải pháp được đề xuất sử dụng Google làm nhà cung cấp danh tính, Nitro làm backend điều phối, PostgreSQL và Drizzle để quản lý dữ liệu, Redis để hỗ trợ quản lý challenge, cùng dịch vụ AI riêng để xử lý khuôn mặt và PAD.

Nên phát triển tuần tự từ Google login và session, sau đó CAPTCHA, đăng ký khuôn mặt, xác thực, PAD và cuối cùng là triển khai production. Không nên bật xác thực sinh trắc học cho người dùng thực trước khi đã kiểm thử hiệu năng, tỷ lệ từ chối nhầm, khả năng chống giả mạo và quy trình xử lý dữ liệu sinh trắc học.