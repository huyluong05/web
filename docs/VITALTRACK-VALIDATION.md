# Kết quả kiểm thử VitalTrack — 10/10/2026

Môi trường: Windows, Node 24.19.0, Edge headless được cài trên máy, nhánh `upgrade/vitaltrack-20261010`. Không deploy. HTTP/browser tests dùng dữ liệu QA cô lập, không nạp `.env` hoặc kết nối database thật.

| Kiểm tra | Kết quả | Phạm vi/bằng chứng |
| --- | --- | --- |
| `npm.cmd test` | 26 passed, 0 failed | Logic domain và HTTP Express; schema cũ/mới qua SQL double |
| Giữ contract route gốc | 48/48 route còn đăng ký | Fixture trích từ commit 37a458d, không cần Git history khi chạy test trên CI |
| `npm.cmd run build` | Đạt | Vite frontend + esbuild backend CJS |
| `VERCEL=1 npm.cmd run build:client -- --outDir build/qa-client` | Đạt | Base `/`, asset/favicons Vercel; không thay asset dist-pages có Git theo dõi |
| `node scripts/verify-backend-start.mjs` | Đạt cả 2 entry point | `server.api.js` và `dist/server.cjs`: production API mode, ping 200, protected health 401, unknown API 404; không kết nối DB |
| `node --env-file=.env scripts/inspect-schema.mjs` | Đạt, read-only | 8 bảng/columns/indexes MySQL 8.0.46; không đọc patient rows |
| `node --env-file=.env scripts/verify-mysql-readonly.mjs` | Đạt, read-only | SQL snapshot thật với ID -1 không tồn tại; session UTC; EXPLAIN dùng idx_records_user_time |
| `node tests/browser-smoke.mjs` | Đạt | React build thật + Express + SQL double, Edge headless |
| Audit AST frontend | 0 tên component JSX chưa khai báo sau sửa | Phát hiện và sửa Activity thiếu import; rà biến tham chiếu chỉ còn URLSearchParams là global chuẩn của trình duyệt |
| `git diff --check` | Đạt | Không có lỗi whitespace mới |
| Git bundle verify | Đạt | Backup code đầy đủ lịch sử; không phải DB backup |

Build còn cảnh báo chunk JS >500 kB: khoảng 1.69 MB chưa gzip (~341 kB gzip). Chưa kết luận hiệu năng mạng chậm hoặc nhiều người dùng đạt từ kích thước này.

## Các tình huống HTTP/domain đã thực hiện

- Đăng ký hợp lệ/không hợp lệ; không tự tạo số đo hoặc mục tiêu mẫu; login, profile, đổi password, logout/revoke; OAuth/OTP mô phỏng bị chặn mặc định.
- Ownership User/Admin, 401/403/404/JWT hết hạn, DB503 khác JWT401, write500 rollback và không success giả.
- Chuỗi 70 → 69 → 68; sửa mốc cũ và xóa mới nhất; trùng recorded_at theo id; bỏ số đo tương lai; zero/null/missing/NaN/date sai; giữ lịch sử. Tâm thu/tâm trương mới nhất độc lập; không tạo cặp huyết áp từ hai lần đo khác nhau.
- Cân nặng current khác baseline/target; start goal giữ; tiến độ giảm/tăng/đi sai hướng/đồng start-target; CRUD goal, đo mới/sửa/xóa cập nhật lại; vận động manual.
- Nhắc CRUD, tắt không due, timezone/ngày lặp/completion/idempotency; schema cũ giữ CRUD cơ bản và từ chối completion chưa hỗ trợ.
- ENUM thiết bị cả 5 loại, MAC tùy chọn/không hợp lệ, ownership, không giả sync, chỉ ingest số đo hợp lệ.
- AI dựa snapshot user, history lưu thật theo user, không probability/score giả; emergency guidance; history JSON cũ/nullable; Admin review object recommendations.
- Admin users/profile validation/roles, full dossier aliases/stats, telemetry edit/delete tính lại latest, dashboard/statistics actual counts và DECIMAL, empty selected range không fallback lịch sử ngoài range; logs/audit/export/session termination.

## Các tình huống trình duyệt đã thực hiện

Lần cuối đạt toàn bộ; profile tạm Edge: `C:/Users/huylu/AppData/Local/Temp/vitaltrack-browser-0fFvOJ`. Ảnh dashboard mobile tại `build/qa-artifacts/dashboard-mobile.png` (artifact local, không Git theo dõi).

1. 8 trang User `/dashboard`, `/health`, `/analytics`, `/goals`, `/reminders`, `/devices`, `/profile`, `/ai-diagnostics` ở 390, 768, 1440 px. Không tràn ngang, không runtime exception, không Invalid Date. Cột biểu đồ có chiều cao thực >10 px, không chỉ kiểm tra tồn tại element.
2. API health503 hiển thị lỗi, navigation vẫn dùng được; không biến lỗi thành success/empty giả.
3. Deep link mở form số đo; numeric input trống; Escape đóng modal. Mục tiêu lấy đúng 68.5 từ số đo mới nhất.
4. Điền và submit form số đo 67.2, ghi chú nhanh “Đo vào buổi sáng”; backend xác nhận mới đóng. Dữ liệu thực trong kho QA có số đo/notes tương ứng; profile đọc đúng cân nặng mới.
5. Hai tab trình duyệt cùng origin: profile đang mở ở tab thứ hai nhận 67.2 sau khi lưu ở tab thứ nhất, không reload.
6. User chưa có số đo thấy lời mời; đóng rồi đổi trang/reload không xuất hiện lại; Admin không thấy lời mời này.
7. 8 trang Admin `/admin`, `/admin/users`, `/admin/telemetry`, `/admin/ai-reviews`, `/admin/devices`, `/admin/logs`, `/admin/audit-logs`, `/admin/settings` render qua Express thật. Mở dossier, mở edit từ list tóm tắt phải tải full profile; lưu giữ bác sĩ/medical_notes/baseline/target cũ. Mở thẩm định AI với history có dữ liệu, không runtime error/NaN.
8. JWT hết hạn điều hướng về login an toàn.

Các lần thất bại trước đó đã được dùng để sửa: Invalid Date ở AI; DECIMAL string bị loại; chiều cao cột; dossier thiếu alias/stats; edit từ list thiếu trường có thể ghi đè dữ liệu; recommendations object bị .map; icon Activity thiếu import. Bộ kiểm thử cũng được sửa lỗi giả lập MySQL timezone/projection và chờ DOM tab mới; không coi lỗi SQL double là bằng chứng backend thật lỗi.

## Những mục chưa đạt điều kiện xác minh production

SQL double không xác minh MySQL transaction/isolation/locking/DDL/TLS. Read-only MySQL không chứng minh Aiven production hoặc CRUD sau migration. Chưa chạy migration trên instance nào, chưa có backup/restore Aiven. Chưa thử Safari/Firefox/thiết bị di động thật, mạng chậm/timeout nhiều mức, commit mất kết nối, tải lớn, nhiều thiết bị thật, Gemini/OAuth/SMS/email/BLE thật, push khi web đóng, revocation nhiều server/restart. Các mục này cần staging và các dịch vụ/phần cứng tương ứng.

Không dùng kết quả build hay 26 tests để tuyên bố bảo toàn 100%. Điều kiện triển khai và rollback tại [VITALTRACK-UPGRADE-REPORT-2026-10-10.md](VITALTRACK-UPGRADE-REPORT-2026-10-10.md).
