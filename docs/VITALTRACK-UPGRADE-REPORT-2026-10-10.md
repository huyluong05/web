# Báo cáo nâng cấp VitalTrack — 10/10/2026

## Trạng thái bàn giao

Nâng cấp trên chính dự án hiện có, nhánh `upgrade/vitaltrack-20261010`, từ commit `37a458d`. Chưa commit/push/deploy. Không chạy DDL/DML trên MySQL cấu hình trong `.env`, không chạy SQL seed, không sửa `.env`. Chỉ đọc metadata, chạy SELECT với ID không có dữ liệu và EXPLAIN; có đặt múi giờ UTC cho phiên kết nối kiểm tra, không thay đổi cấu hình MySQL toàn cục.

Không tuyên bố bảo toàn 100% hoặc sẵn sàng production. Các kết quả kiểm thử dưới đây có phạm vi cụ thể; migration, Aiven, nhà cung cấp AI và phần cứng cần bước xác nhận riêng.

Audit và kế hoạch được viết trước khi sửa tại [VITALTRACK-AUDIT-2026-10-10.md](VITALTRACK-AUDIT-2026-10-10.md). Danh sách chính xác file chỉnh sửa/bổ sung tại [VITALTRACK-CHANGED-FILES.txt](VITALTRACK-CHANGED-FILES.txt).

## A — Audit

Đã kiểm kê public/user/admin pages, components/forms/charts/hooks/context, API client, Express routes/middleware, cả hai entry point và hai schema, cấu hình Vite/Vercel/Render. Chức năng gốc gồm xác thực, hồ sơ, số đo/lịch sử/biểu đồ, mục tiêu, nhắc nhở, thiết bị, AI/chat/lịch sử, Admin thống kê/quản lý bệnh nhân/y bạ/thẩm định/logs/settings/export.

Phát hiện chính: mục tiêu lấy số đo vừa ghi dù đo ở quá khứ; sửa/xóa không tính lại; hồ sơ nhầm cân nặng ban đầu với hiện tại; số mẫu điền sẵn; thiếu nhiều API Admin; dossier thiếu alias và stats mà UI dùng; object khuyến nghị AI bị `.map()`; MySQL DECIMAL là chuỗi làm mất dữ liệu biểu đồ/thống kê; biểu đồ cột thiếu chiều cao xác định; lỗi API dễ bị hiển thị như không có dữ liệu; OAuth/OTP và IoT mô phỏng; AI suy diễn bệnh/xác suất chưa kiểm chứng; audit ghi trùng.

Hai schema không tương đương. `database/schema.sql` chứa thao tác phá hủy và không đủ bảng; **không dùng file này làm migration**. Metadata thực tế tại [MYSQL-SCHEMA-INSPECTION.json](MYSQL-SCHEMA-INSPECTION.json) cho thấy MySQL 8.0.46, 8 bảng, health fields NOT NULL, chưa có health.updated_at/reminder timezone-repeat-completion/settings_json. Đây là instance đang cấu hình cục bộ, không chứng minh schema/TLS của Aiven production.

## B — Bảo vệ dự án

- Working tree ban đầu sạch, tạo nhánh riêng; `main` không đổi.
- Git bundle `C:/Users/huylu/AppData/Local/Temp/vitaltrack-before-upgrade-20261010.bundle` đã được `git bundle verify` xác nhận hợp lệ, đủ lịch sử. Nên chép sang nơi lưu lâu dài trước triển khai. Bundle không chứa backup database hoặc cấu hình bí mật chưa được Git theo dõi.
- File SQL gốc, cấu hình hosting và các trang/menu được giữ. Asset build `dist-pages` có Git theo dõi được khôi phục nguyên trạng sau kiểm tra; build QA đi vào `build/qa-client`.
- Chưa có backup Aiven và thử phục hồi; vì vậy chưa đủ điều kiện chạy migration trên production.

## C — Logic số đo, hồ sơ, mục tiêu và đồng bộ

Các file chính: `server/health-domain.js`, `server/health-routes.js`, `server/profile-fields.js`, `server.js`, API client, AuthContext, `useDataSync`, các trang User và GoalModal/RecordMetricModal.

1. Số đo hiện tại lấy theo `recorded_at DESC, id DESC`, loại giá trị thiếu/không hợp lệ và số đo tương lai. Có nguồn riêng cho cân nặng, tâm thu, tâm trương, nhịp tim và cặp huyết áp cùng lần đo. Không ghép hai lần đo thành một cặp huyết áp giả. Lịch sử giữ các bản ghi có sẵn; bản ghi cũ không bị đổi ngày.
2. Hồ sơ đọc cân nặng hiện tại từ lịch sử. `base_weight_kg` là mốc khai báo; `target_weight_kg` độc lập. Muốn đổi hiện tại từ hồ sơ dùng liên kết tạo số đo, giữ lịch sử. Health CRUD không ghi đè mục tiêu cân nặng.
3. CRUD số đo và đồng bộ mục tiêu chạy transaction, khóa user để tránh các thao tác cùng tài khoản tranh nhau cập nhật. Sửa bản ghi cũ không làm nó thành mới nhất; xóa mới nhất chọn lại số đo tiếp theo. Nếu không còn số đo, current trả null và cờ unavailable, không lấy baseline thay thế.
4. Tạo mục tiêu lấy current từ DB; có thể kiểm tra/chỉnh mốc bắt đầu trước lưu. Mốc của mục tiêu cũ được giữ. Tiến độ tính đúng hướng tăng/giảm, giới hạn 0–100%, không dùng giá trị tuyệt đối. Mục tiêu vận động giữ cập nhật thủ công. Trạng thái completed giữ dấu mốc hoàn thành; % hiện tại vẫn được tính lại khi số đo thay đổi.
5. API success mới phát sự kiện cập nhật; storage event đồng bộ các tab. Tab ẩn ghi nhớ thay đổi và tải khi hiện lại; polling 120 giây chỉ khi trang hiện, focus refresh có giới hạn. GET đang chạy được gộp theo token/endpoint. Không thêm WebSocket/SSE. Đa thiết bị có độ trễ polling, chưa kiểm chứng bằng hai thiết bị thật.
6. Hiện ngày đo/ngày sửa nếu có; đánh dấu dữ liệu cũ theo `VITE_HEALTH_STALE_DAYS` (mặc định 7). Trước migration thời điểm sửa không biết được ghi rõ, không lấy created_at giả làm updated_at.
7. Admin lưu được các trường hồ sơ có trong schema, xác thực dữ liệu và phân quyền Admin/User. Mở chỉnh sửa từ list phải tải hồ sơ đầy đủ trước, tránh ghi đè các trường không có trong list. Xóa các giá trị mẫu điền sẵn, không tự gán thuốc/bệnh/nhóm máu/ngày sinh. Chức danh/ma trận quyền chi tiết vốn chưa có persistence/enforcement được giữ trên UI nhưng vô hiệu hóa có giải thích; không giả vờ có RBAC chi tiết.

Ảnh hưởng: các trang đọc sức khỏe và mục tiêu, profile/y bạ, các API ghi số đo từ User/Admin/IoT. Giữ URL, method và wrapper response cũ; thêm current/capabilities/alias. Các API Admin thiếu được bổ sung với SQL thật và requireAdmin.

## D — Trải nghiệm

Các file chính: common components mới, Modal, UserLayout, forms, public Login/Register, user pages, index.html và public/favicon.*.

- Nhắc ghi số đo dạng khung nhỏ không chặn navigation, chỉ User; chưa có record, số đo cũ hoặc đến lịch. Ghi nhận ngay dẫn `/health?record=1`; Escape/đóng/để sau 24h/không nhắc lại. Lựa chọn theo tài khoản trên trình duyệt; không hứa đồng bộ lựa chọn giữa thiết bị. Mỗi phiên không nhắc lại ở từng trang; có thể bật lại tại Nhắc nhở.
- Ghi chú tự do không bắt buộc, thêm lựa chọn ngữ cảnh, lưu/hiện lại trong lịch sử và form; biểu đồ giữ ghi chú tooltip. Không suy diễn thành bệnh.
- Nhắc nước, vận động, thuốc, đo chỉ số; giữ CRUD/bật tắt. UI tính chưa hoàn thành/quá giờ/hoàn thành theo múi giờ/ngày lặp, chống thông báo trùng trong trình duyệt. Lịch nâng cao và hoàn thành cần cột mới; schema cũ vẫn CRUD lịch cơ bản, thao tác chưa hỗ trợ trả lỗi rõ 409. Không xin Notification permission, không có thông báo khi đóng website.
- Favicon SVG/PNG 64 px lấy lại icon HeartPulse và màu primary hiện có, asset BASE_URL; không thay logo các trang.
- Modal chung có ARIA, Escape, giữ focus trong hộp thoại và trả focus khi đóng. Hướng dẫn thu gọn có thể mở lại theo từng trang, giải thích chỉ số/MAC/mục tiêu/AI. Public login/register cũng có hướng dẫn.
- Biểu đồ nhận số DECIMAL dạng chuỗi đúng, thiếu dữ liệu không thành 0; cột có chiều cao thực và ngày cuối là ngày đo thật. Biểu đồ kết hợp chỉ dùng record đủ huyết áp + nhịp tim và ghi rõ điều kiện này; biểu đồ riêng/lịch sử vẫn giữ record thiếu một phần.
- API lỗi có thông báo/retry, không thay bằng mảng rỗng để che lỗi. JWT không bị xóa vì lỗi mạng/DB; 401 và DB503 được phân biệt. Request timeout 20 giây có nhắc kiểm tra dữ liệu trước khi gửi lại.

## E — Thiết bị và AI

Các file chính: `server/device-routes.js`, `server/ai-routes.js`, `server/admin-routes.js`, `server/settings-routes.js`, DevicesPage, AI pages/services, medicalSources, ProfilePage.

Thiết bị: 5 type thống nhất ENUM; MAC tùy chọn, có ví dụ/kiểm tra/hướng dẫn. Lưu thiết bị là đăng ký, status idle, pin/sync time chưa biết là null. API sync không có số đo thực trả 409 giải thích; ingest/payload thực phải hợp lệ và đúng chủ sở hữu. Không sinh số đo/battery/MAC giả. Giữ API pair/sync/ingest và quản lý Admin. **Chưa có bộ tích hợp BLE/Apple Watch/GATT thật**; nút đăng ký không thực hiện Bluetooth.

AI: đọc MySQL, lưu ai_diagnoses thật, history bền vững. Chế độ quy tắc tham chiếu và giải thích Gemini được ghi rõ; model lỗi không làm giả thành công lưu. Nhập riêng cho phân tích không tạo health record. Không hiển thị xác suất bệnh/% chính xác/risk score chưa đánh giá; giữ nội dung lịch sử có sẵn và ẩn số xác suất không kiểm chứng. Admin review xử lý được recommendations object/array cũ. Cảnh báo khẩn cấp được xử lý bằng quy tắc trước khi gọi model; không kê thuốc/chẩn đoán cá nhân hóa.

Nguồn đã mở xác minh ngày 10/10/2026: [AHA huyết áp](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings) (review 14/08/2025), [AHA nhịp tim](https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse) (review 13/05/2024), [WHO phân nhóm BMI](https://www.who.int/data/nutrition/nlis/info/malnutrition-in-women) (không nêu ngày cập nhật), [nghiên cứu Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/) (02/1990). Hồ sơ không còn giả tuổi 30 để tính BMR, không áp dụng phân nhóm người lớn khi thiếu tuổi/trẻ em; công thức chỉ là ước tính có giới hạn, không phải chỉ định dinh dưỡng. Chưa có đánh giá y khoa/độ chính xác thực nghiệm cho ứng dụng.

An toàn/nhất quán liên quan: chặn OAuth/OTP mô phỏng mặc định, giữ code demo chỉ khi bật cờ phát triển; không bật trong production. Google/Apple UI không mở popup với client ID mẫu trong production. Production thiếu JWT_SECRET dừng startup. Không dùng reset password cố định. Audit chỉ INSERT một lần, logs đọc DB; export đọc dữ liệu thật và loại password. Export JSON ứng dụng **không phải backup MySQL đầy đủ**. Sessions/revocation chỉ trong tiến trình hiện tại, không bền qua restart hoặc nhiều replica.

## F — Kiểm thử thực tế và giới hạn bằng chứng

Chi tiết lệnh/kết quả cuối được ghi tại [VITALTRACK-VALIDATION.md](VITALTRACK-VALIDATION.md). Bộ HTTP dùng Express middleware/routes thật với SQL double nghiêm ngặt, không dùng `.env` hoặc dữ liệu thật. Browser dùng Edge headless, React build thật + Express + dữ liệu QA cô lập. Metadata/SELECT/EXPLAIN MySQL là kiểm tra riêng, không phải kiểm thử ghi Aiven.

Các nhóm được kiểm: đăng ký/login/logout/password/profile; 400/401/403/404/500/503; JWT hết hạn; phân quyền/ownership; zero/null/missing/future/backdated/tie timestamp; health thêm/sửa/xóa/latest; goals start/current/progress; notes; reminders CRUD/disabled/repeat/timezone/completion; IoT type/không giả sync; AI history/reviews; admin users/dossier/telemetry/dashboard/statistics/logs/export/sessions; giữ các API gốc. Browser kiểm responsive 390/768/1440, popup/Escape, form save/ghi chú/profile, goal prefill, hai tab, API lỗi, admin mở dossier/review và JWT hết hạn.

Chưa kiểm chứng: ghi CRUD/transaction/DDL trên MySQL thật/Aiven; TLS/CA Aiven; hành vi tải lớn/DB pool/mất kết nối lúc commit; mạng chậm nhiều mức/timeout và retry trùng; hai thiết bị thật; Safari/Firefox/iOS/Android thật; BLE; Gemini thật; OAuth/SMS/email; thông báo khi đóng web; RBAC chi tiết; thu hồi JWT qua restart/nhiều replica. Không suy ra các mục này đã đạt từ build hoặc SQL double.

## G — Chuẩn bị triển khai, chưa triển khai

Migration review-only: [20261010_vitaltrack_upgrade.sql](../database/migrations/20261010_vitaltrack_upgrade.sql). Chưa chạy. Không tự động chạy lúc startup. Tác động: cho phép health nullable, thêm updated_at nullable; mở rộng ENUM reminders có giữ NULL cũ; thêm timezone/repeat_days/completed_dates; thêm settings_json. Không xóa bản ghi hoặc sửa số đo có sẵn. DDL MySQL tự commit, không coi rollback transaction là rollback DDL.

Trước khi chạy: lấy SHOW CREATE TABLE từ **instance Aiven đích**, so sánh metadata, backup đầy đủ và thử restore sang DB tách biệt, xác nhận quyền ALTER/dung lượng/maintenance window. Mỗi section chỉ chạy một lần sau kiểm tra cột tồn tại; file không idempotent. **Cần người dùng phê duyệt trước khi chạy trên Aiven.**

Staging: chạy migration trên bản sao đã restore, kiểm CRUD với dữ liệu QA của cả schema cũ/mới, null record, đồng thời nhiều request, định dạng DATETIME và múi giờ. Kết nối mới dùng UTC ở mysql2 lẫn SQL session. Legacy DATETIME có thể trộn UTC và giờ local (seed/import/NOW); không tự chuyển đổi hàng loạt. Cần kiểm tra nguồn nhập trước khi xử lý lịch sử.

Cấu hình: giữ JWT_SECRET hiện hành an toàn, CORS_ORIGINS đúng frontend, MYSQL_SSL_CA xác thực, VITE_API_URL trỏ backend Render và VITE_BASE_PATH=/ trên Vercel. `.env.example` bổ sung biến, không chứa key thật. Nếu dùng Gemini cần kiểm model/key/timeout trên staging. `render.yaml` hiện có autoDeploy=true; không push/merge nhánh production trước khi được phép. Build lớn ~1,69 MB JS còn cảnh báo chunk; chưa code-split toàn dự án vì tránh tăng phạm vi hồi quy.

Settings JSON lưu thật sau migration, nhưng nhiều tùy chọn cũ chưa có pipeline runtime (email/bảo trì/mô hình/approval/timeout). UI nói rõ giới hạn; không coi lưu cấu hình là đã kích hoạt các tích hợp đó. Cảnh báo tham chiếu hiện dùng nguồn AHA; chưa áp dụng ngưỡng tùy chỉnh vào kết luận AI.

Rollback source: lưu patch và các file mới, review diff trên nhánh riêng; mốc gốc `37a458d`/bundle. Không reset --hard hoặc xóa file không rõ nguồn. Nếu chưa migration/ghi partial, quay về source gốc qua checkout/worktree tách biệt để kiểm tra. Sau khi có partial record, không rollback mù về app cũ vốn giả định NOT NULL: giữ cột mới, dùng phiên bản tương thích đã kiểm thử và lập phương án xử lý dữ liệu; không DROP cột hoặc ép NOT NULL làm mất dữ liệu.

Điều kiện go-live: phê duyệt migration, backup/restore đạt, staging CRUD và kiểm thử thiết bị/provider cần dùng đạt, review diff và các giới hạn được chấp nhận; sau đó mới xin/xác nhận triển khai production cụ thể.
