1. Chốt phạm vi phiên bản đầu
Trước mắt, nên triển khai:
Chức năng	Nội dung
Hồ sơ quân nhân	Họ tên, ảnh chân dung, số điện thoại, địa chỉ, ngày sinh
Liên kết tài khoản	Mỗi tài khoản được liên kết với một hồ sơ quân nhân
Xác minh trước khi xem	Đăng nhập Google → xác minh khuôn mặt → xem hồ sơ
Quản lý hồ sơ	Người có quyền tạo, cập nhật và khóa hồ sơ
Phân quyền	Quân nhân xem hồ sơ của mình; cán bộ xem hồ sơ thuộc phạm vi được giao
Nhật ký	Ghi nhận việc xem, sửa hồ sơ và kết quả xác minh


Giả định cho kế hoạch: mỗi quân nhân dùng tài khoản riêng để xem hồ sơ của mình. Chức năng cán bộ quản lý nhiều hồ sơ được bổ sung bằng quyền riêng.
Không nên dùng camera để tìm một người trong toàn bộ danh sách quân nhân. Sau Google login, hệ thống đã biết tài khoản cần xác minh và chỉ cần so sánh với mẫu khuôn mặt của tài khoản đó.
2. Thiết kế luồng sử dụng
Lần đầu:
1. Cán bộ tạo hồ sơ quân nhân.
2. Liên kết hồ sơ với đúng tài khoản người dùng qua quy trình được kiểm tra.
3. Người dùng đăng nhập Google.
4. Đăng ký khuôn mặt theo quy trình hiện có.
5. Backend ghi nhận tài khoản đã có mẫu khuôn mặt hợp lệ.
Các lần truy cập sau:
1. Người dùng đăng nhập Google.
2. Hệ thống chỉ hiển thị màn hình yêu cầu xác minh.
3. Backend tạo challenge gắn với session và mục đích view_military_profile.
4. Người dùng thực hiện xác minh khuôn mặt và PAD.
5. Backend xác nhận kết quả, cấp quyền xem hồ sơ có thời hạn.
6. API kiểm tra quyền trước khi trả thông tin và ảnh.
7. Hết thời hạn hoặc đăng xuất thì phải xác minh lại.
Việc ẩn trang ở frontend chưa đủ. Backend phải chặn cả API hồ sơ và API ảnh nếu chưa xác minh. OWASP khuyến nghị mặc định từ chối và kiểm tra quyền trên mỗi request. OWASP Cheat Sheet Series
3. Bổ sung cơ sở dữ liệu
Giữ các bảng tài khoản, session, challenge và mẫu sinh trắc học hiện có; bổ sung các bảng sau.
Bảng	Trường chính đề xuất
military_profiles	id, user_id, full_name, date_of_birth, phone_number, address, portrait_file_id, status, created_at, updated_at
private_files	id, storage_key, mime_type, size_bytes, created_at
access_grants	id, session_id, purpose, verification_attempt_id, verified_at, expires_at, revoked_at
user_roles	user_id, role, phạm vi quản lý nếu có


Một số quyết định quan trọng:
- user_id trong hồ sơ có ràng buộc unique nếu mỗi tài khoản chỉ có một hồ sơ.
- Ngày sinh dùng kiểu date; giao diện hiển thị dd/MM/yyyy.
- Số điện thoại dùng kiểu chuỗi để giữ số 0 đầu.
- Ảnh chân dung và mẫu sinh trắc học được quản lý riêng.
- Không dùng ảnh đại diện Google làm mẫu xác minh khuôn mặt.
- Nếu tạo hồ sơ trước khi cấp tài khoản, user_id có thể để trống đến khi liên kết.
Có thể bổ sung cấp bậc, chức vụ, đơn vị sau khi chức năng cơ bản ổn định.
4. Xây dựng quyền xem sau xác minh
Nên tạo một quyền truy cập tạm thời trong access_grants, thay vì lưu cờ face_verified = true lâu dài trong tài khoản.
Ví dụ chính sách ban đầu:
Tình huống	Xử lý đề xuất
Google login thành công	Chỉ được truy cập các chức năng phục vụ xác minh
Khuôn mặt và PAD hợp lệ	Cấp quyền xem hồ sơ trong 5 phút
Hết 5 phút	Khóa màn hình hồ sơ, yêu cầu xác minh lại
Đăng xuất	Thu hồi session và quyền xem
Đăng nhập trên thiết bị khác	Thiết bị đó phải xác minh riêng
Thay mẫu khuôn mặt hoặc khôi phục tài khoản	Thu hồi các quyền đã cấp


5 phút là giá trị khởi đầu để thử nghiệm, có thể điều chỉnh theo cách sử dụng thực tế. Xác minh bổ sung trước khi truy cập chức năng nhạy cảm phù hợp với hướng dẫn tái xác thực của OWASP. OWASP Cheat Sheet Series
Mỗi request đọc hồ sơ cần kiểm tra:
Session còn hiệu lực
→ Tài khoản đang hoạt động
→ Có quyền xem hồ sơ được yêu cầu
→ Quyền xác minh khuôn mặt còn hạn và thuộc session hiện tại
→ Trả dữ liệu

Khi quyền hết hạn, frontend phải xóa dữ liệu hồ sơ khỏi trạng thái hiển thị. Dữ liệu và ảnh nhạy cảm không nên được lưu vào localStorage, cache ngoại tuyến hoặc service worker.
5. Phân quyền người dùng
Vai trò	Quyền đề xuất
Quân nhân	Xác minh khuôn mặt và xem hồ sơ của mình
Cán bộ quản lý	Xem, cập nhật hồ sơ trong phạm vi được giao sau khi tự xác minh
Quản trị hệ thống	Quản lý tài khoản và phân quyền; quyền đọc hồ sơ cấp riêng


Xác minh khuôn mặt thành công chỉ xác nhận người đang sử dụng tài khoản; quyền truy cập mới quyết định họ được xem hồ sơ nào.
Ví dụ: quân nhân A xác minh thành công vẫn không được xem hồ sơ B bằng cách thay ID trong URL.
Với cán bộ quản lý, hệ thống xác minh khuôn mặt của cán bộ đang thao tác, sau đó kiểm tra phạm vi hồ sơ cán bộ đó được phép xem.
6. Bảo vệ ảnh chân dung
Ảnh cũng phải đi qua cơ chế kiểm tra quyền giống dữ liệu hồ sơ:
- Lưu trong vùng riêng tư hoặc Docker volume riêng, ngoài thư mục public.
- Database lưu khóa tệp, không lưu URL công khai.
- Trả ảnh qua endpoint có xác thực.
- Kiểm tra nội dung tệp, định dạng và kích thước khi upload.
- Loại bỏ metadata ảnh không cần thiết.
- Trả hồ sơ và ảnh với Cache-Control: no-store.
Phiên bản đầu có thể dùng volume riêng và Nitro trả ảnh qua API; chưa cần bổ sung dịch vụ lưu trữ phức tạp.
7. API cần bổ sung
Method	Endpoint	Chức năng
GET	/api/me/military-profile	Xem hồ sơ cá nhân sau xác minh
GET	/api/me/military-profile/portrait	Xem ảnh cá nhân sau xác minh
GET	/api/auth/access-status	Kiểm tra quyền xem còn hiệu lực
POST	/api/admin/military-profiles	Tạo hồ sơ
GET	/api/admin/military-profiles	Danh sách trong phạm vi được phép
GET	/api/admin/military-profiles/:id	Xem chi tiết
PATCH	/api/admin/military-profiles/:id	Cập nhật hồ sơ
POST	/api/admin/military-profiles/:id/portrait	Tải ảnh chân dung
POST	/api/admin/military-profiles/:id/link-account	Liên kết tài khoản


Tận dụng /api/challenges và /api/biometrics/verify hiện có. Sau khi xác minh thành công, backend cấp access_grant đúng mục đích; frontend không được tự gửi trạng thái “đã xác minh” để mở quyền.
API danh sách, tìm kiếm và ảnh thu nhỏ cũng cần được bảo vệ vì chúng có thể chứa thông tin cá nhân.
8. Thứ tự phát triển
Giai đoạn	Công việc	Điều kiện hoàn thành
1. Chuẩn hóa nghiệp vụ	Chốt trường hồ sơ, vai trò, liên kết tài khoản, thời hạn xem	Có quy tắc truy cập rõ ràng
2. Database	Tạo schema Drizzle, migration, ràng buộc và index	Tạo và liên kết hồ sơ đúng
3. Quyền truy cập	Xây access_grants, middleware kiểm tra session, khuôn mặt và quyền	Gọi API trực tiếp cũng không vượt được kiểm tra
4. Hồ sơ và ảnh	Xây API đọc, cập nhật, upload và đọc ảnh riêng tư	Dữ liệu và ảnh đều được bảo vệ
5. Giao diện	Màn hình xác minh, hồ sơ cá nhân, quản lý hồ sơ, trạng thái hết hạn	Hoàn thành được toàn bộ luồng
6. Kiểm thử và triển khai	Kiểm thử phân quyền, hết hạn, replay, backup và restore	Đạt các tình huống nghiệm thu


Nên hoàn thiện luồng một quân nhân xem hồ sơ của mình trước, sau đó triển khai màn hình quản lý nhiều hồ sơ.
9. Các tình huống bắt buộc kiểm thử
- Đã đăng nhập Google nhưng chưa xác minh: không đọc được hồ sơ và ảnh.
- Xác minh sai hoặc PAD không đạt: không được cấp quyền.
- Xác minh thành công: chỉ xem được hồ sơ thuộc quyền của mình.
- Đổi ID hồ sơ: không đọc được dữ liệu người khác.
- Quyền hết hạn: API từ chối và giao diện khóa lại.
- Challenge cũ hoặc kết quả xác minh thuộc session khác: bị từ chối.
- Đăng xuất rồi dùng lại cookie cũ: bị từ chối.
- Khóa tài khoản hoặc thu hồi mẫu khuôn mặt: quyền xem bị thu hồi.
- Cán bộ ngoài phạm vi quản lý: không đọc, sửa được hồ sơ.
- Nhật ký ghi nhận người thao tác, hồ sơ, hành động, thời điểm và kết quả; không chứa embedding, token hoặc toàn bộ nội dung hồ sơ.