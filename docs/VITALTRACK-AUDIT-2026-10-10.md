# VitalTrack — audit và kế hoạch nâng cấp (10/10/2026)

## A. Phạm vi và hiện trạng trước thay đổi

Mốc khôi phục: commit `37a458d` trên `main`; working tree sạch. Nhánh làm việc: `upgrade/vitaltrack-20261010`. Git bundle đã được tạo trong thư mục TEMP của Windows: `vitaltrack-before-upgrade-20261010.bundle`. Đây là backup mã nguồn có Git theo dõi, **không phải backup MySQL hoặc .env**. Không đọc/in giá trị .env, không chạy các script clean_db/fix_db/update_users hoặc SQL seed.

Đã kiểm kê src (pages, components, charts, forms, hooks, context, routes, API), hai server entry point, hai schema, scripts và cấu hình Vercel/Render/Vite. Backend tập trung trong server.js, server.api.js chỉ bật API_ONLY. Không có bộ kiểm thử tự động; npm lint hiện chỉ in thông báo thành công. Build nền `npm.cmd run build` đạt, cảnh báo bundle JS khoảng 1.64 MB. PowerShell chặn npm.ps1; sử dụng npm.cmd.

Các trang/chức năng hiện có:

| Nhóm | Chức năng |
| --- | --- |
| Public | Landing, hướng dẫn, đăng ký, đăng nhập bằng mật khẩu, Google/Apple mô phỏng, OTP mô phỏng, quên mật khẩu, 404 |
| User | Dashboard, CRUD cân nặng/huyết áp/nhịp tim và ghi chú, 4 biểu đồ phân tích, CRUD mục tiêu cân nặng/huyết áp/nhịp tim/vận động, CRUD nhắc nước/vận động, hồ sơ 5 nhóm và đổi mật khẩu, thiết bị, AI phân tích/chat/lịch sử |
| Admin | Dashboard/thống kê, quản lý tài khoản/trạng thái/vai trò/reset mật khẩu, dossier bệnh nhân (records/goals/devices/AI), telemetry/thẩm định, AI reviews, thiết bị, logs/audit/sessions, settings/export |
| Hạ tầng | JWT và kiểm tra tài khoản MySQL, requireAdmin, CORS, TLS CA Aiven, audit log, Vite proxy, Vercel SPA rewrite, Render API healthcheck |

## Lỗi/rủi ro và kế hoạch theo thứ tự

| Mức | Phát hiện thực tế | File/nhóm sửa dự kiến | Cách tương thích và kiểm thử |
| --- | --- | --- | --- |
| Cao | POST health dùng bản ghi vừa thêm để cập nhật weight goals; PUT/DELETE không cập nhật goals; progress dùng trị tuyệt đối nên đi ngược hướng vẫn tăng | server.js, module health dùng chung, forms/goals/dashboard/profile | Truy vấn theo recorded_at DESC, id DESC; giữ response latest/previous, bổ sung current theo từng chỉ số; kiểm tra ví dụ ngày 01/05/10, sửa quá khứ, xóa mới nhất, trùng thời gian, tăng/giảm cân |
| Cao | Hồ sơ dùng base_weight_kg để tính cân nặng/BMI; form tự điền 68/65/170; metric/goal forms tự điền số đo giả | ProfilePage, RecordMetricModal, GoalModal | Giữ base/target riêng; hiển thị current từ records; cập nhật cân hiện tại qua chức năng ghi nhận; không overwrite lịch sử hoặc target; không seed giá trị khi thiếu |
| Cao | IoT pair tự gán MAC cố định/battery/firmware/status connected; sync và ingest tự tạo số đo | server.js, DevicesPage, AdminDevicesPage, types | Giữ URL/cấu trúc response; chỉ đăng ký idle, MAC tùy chọn và validate ENUM; sync cần payload thật, thiếu thì trả lỗi rõ; ingest kiểm tra quyền sở hữu và số đo |
| Cao | AI/chat đọc dbUsers/dbHealthRecords mẫu trong RAM, fallback gán bệnh và % không được đánh giá; history không lưu DB | server.js, aiService, AI pages, nguồn tham khảo | Đọc MySQL, phân biệt rules/Gemini, không suy ra bệnh hoặc %; lưu history thật; nguồn chính thức đã mở xác minh; cảnh báo cần hỗ trợ y tế |
| Cao | Frontend gọi các API backend chưa có: admin telemetry GET/PUT/DELETE, ai-reviews GET/PUT, devices DELETE, logs GET, audit-logs GET/detail, sessions GET/DELETE | server.js, module admin bổ sung | Triển khai nghiệp vụ thật, SQL thật/nguồn session RAM được ghi rõ; requireAdmin; không trả success giả |
| Cao | database/schema.sql cũ có DROP, thiếu profile/devices/AI/audit/settings; schema.sql là bản rộng hơn; health không có updated_at và không cho NULL; reminders chưa lưu timezone/repeat/completion | database/migrations, tài liệu deployment | Không chạy schema cũ; xuất migration riêng có preflight/backup/approval, không chạy Aiven. Cho phép app tương thích schema hiện tại; tính năng cần cột mới phải báo rõ nếu chưa có |
| Cao | social-login tin email do client đưa; OTP trả mã trực tiếp và chưa có dịch vụ gửi; JWT secret có fallback cố định; auth middleware biến lỗi DB thành 401 | server.js | Chặn xác thực mô phỏng ngoài cờ phát triển rõ ràng; fail startup production nếu thiếu secret; phân biệt 503 DB với 401 JWT. Không có provider thật nên chưa thể xác minh OAuth/SMS |
| Vừa | createAuditLog INSERT hai lần; logs/sessions khởi tạo bản mẫu | server.js | Một lần ghi DB; dữ liệu mẫu chỉ hiện trong chế độ demo rõ ràng; giữ chức năng log |
| Vừa | API client trả success:false thay vì throw nhưng nhiều pages chỉ xử lý catch, khiến lỗi như empty state; refreshUser xóa JWT khi lỗi mạng/500 | client, AuthContext, các pages | Giữ contract success/data/message, thêm status; lỗi tải hiển thị riêng; chỉ logout khi auth bị từ chối; không giấu lỗi bằng [] |
| Vừa | Chưa có đồng bộ các tab/trang/phiên; dashboard không ghi tuổi dữ liệu; datetime-local dùng UTC | event hook, user pages/forms | Event sau API success + storage event, focus refresh và polling có giới hạn khi trang hiện; định dạng input giờ local, API gửi ISO; không WebSocket |
| Vừa | Nhắc nhở chỉ bật/tắt CRUD, không completion/due; chỉ render water/exercise | reminder module/forms/pages/layout | Giữ 2 nhóm cũ, thêm measurement/medication, lịch lặp/múi giờ/completion khi schema hỗ trợ; chỉ thông báo trong web đang mở, không xin Notification permission |
| Nhỏ | Thiếu favicon, logo hiện dùng HeartPulse trắng trên nền primary-600; modal thiếu focus trap/ARIA; ghi chú chưa có lựa chọn nhanh; cần hướng dẫn theo ngữ cảnh | index.html, public/favicon, Modal, form notes, contextual help | Tái sử dụng đúng icon/brand bằng SVG và PNG, đường dẫn BASE_URL; giữ menu/trang; keyboard/responsive; ghi chú tự do được giữ |

## B. Bảo vệ và rollback

Không sửa production DB, không deploy, không xóa bảng/cột/bản ghi có sẵn. Không chạy script gốc thao tác dữ liệu. SQL migration là artifact chờ phê duyệt sau khi lấy SHOW CREATE TABLE và backup từ instance đích. Git branch/bundle bảo vệ source; thay đổi được review bằng git diff. Có thể khôi phục từng file từ commit 37a458d sau khi lưu bản diff; không dùng reset --hard. Rollback DB ưu tiên giữ các cột/bảng bổ sung và quay lại phiên bản app cũ; không dùng migration down phá hủy dữ liệu.

## C–E. Quy tắc triển khai đã chốt trước khi sửa

1. Một module xác định số đo hợp lệ theo từng chỉ số, timestamp đo <= hiện tại, thứ tự recorded_at/id. Lịch sử giữ toàn bộ. Data quá ngưỡng stale cấu hình được vẫn xem được nhưng ghi rõ ngày đo/cũ; không gọi là số đo hôm nay.
2. Health CRUD dùng validation chung; mục tiêu đọc current từ dữ liệu mới nhất, start_value giữ cố định. Goals đã hoàn thành được giữ milestone, tiến độ hiện tại luôn tính đúng hướng. Không có records thì current không có, không dùng base_weight thay thế.
3. Schema gốc NOT NULL được giữ tương thích; trước migration chỉ nhận bản ghi đầy đủ, thiếu trả 400 rõ. Migration chuẩn bị cho NULL/updated_at và reminders nhưng không chạy tự động. UI phải phản ánh khả năng backend.
4. Nhắc đo sau auth: chỉ user, tối đa một lần phiên, chưa có record hoặc stale/due; snooze/disable theo tài khoản trên trình duyệt, có thể mở lại thiết lập. Không chặn navigation; link /health?record=1.
5. Cải tiến reminders giữ CRUD, dữ liệu hoàn thành/lịch cần persistence thật. Không tuyên bố push/background khi chưa có service worker/push service.
6. Giữ API cũ, bổ sung field thay vì đổi tên. Admin dossier aliases đang được frontend sử dụng được giữ.

## F–G. Kiểm thử và điều kiện triển khai

Thêm test logic và test HTTP trên kho dữ liệu cô lập (không trỏ .env/Aiven). Kiểm tra các hành vi dữ liệu, lỗi 400/401/403/404/500/503, ownership, API contracts, đăng ký/login/logout, profile, goals, reminders, devices, AI/admin. Chạy node --check, frontend build và backend bundle/start/ping. Kiểm tra toàn bộ route cũ còn tồn tại. UI kiểm tra browser nếu có môi trường; ghi rõ mọi trường hợp chưa thể thực hiện.

Chưa có backup/schema thực từ Aiven, tài khoản QA, thiết bị BLE thật, dịch vụ SMS/OAuth, trình duyệt tự động hoặc môi trường staging trong phiên này. Không được coi unit/HTTP mock tests hoặc build đạt là chứng minh MySQL Aiven, responsive, đa thiết bị hoặc bảo toàn 100%. Checklist thực tế phải được hoàn tất trên staging trước deploy.

## Bổ sung sau thực hiện (không thay đổi kết quả audit ban đầu)

Đã sử dụng Edge cài trên máy để kiểm thử headless với dữ liệu QA cô lập, và đọc metadata/SELECT/EXPLAIN trên MySQL cấu hình hiện tại. Không có DDL/DML hoặc đọc dữ liệu bệnh nhân thật. Đây không phải Aiven staging/production được xác nhận. Chi tiết kết quả và giới hạn tại [VITALTRACK-VALIDATION.md](VITALTRACK-VALIDATION.md), báo cáo từng giai đoạn tại [VITALTRACK-UPGRADE-REPORT-2026-10-10.md](VITALTRACK-UPGRADE-REPORT-2026-10-10.md).
