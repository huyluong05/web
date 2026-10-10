# Sửa tiếng Việt bị biến thành dấu hỏi — 10/10/2026

## Chẩn đoán trước sửa

- Đã quét 82 file nguồn React/backend/SQL: không phát hiện chuỗi chữ bị hỏng như ảnh.
- Kiểm tra chỉ đọc MySQL cấu hình: kết nối localhost; client, connection, results và database đều `utf8mb4`, database collation `utf8mb4_unicode_ci`. Truy vấn round-trip tiếng Việt và ký tự Unicode 4 byte đạt.
- Hai tên mục tiêu đang lưu đã chứa byte `3F` (dấu `?`), khớp chính xác bản gốc trong `schema.sql` khi từng byte UTF-8 ngoài ASCII bị thay bằng dấu hỏi. Không thể sửa những byte đã mất bằng CSS, font hoặc đổi charset đơn thuần.
- Tên thiết bị, nhắc nhở, ghi chú và một số trường hồ sơ/log mẫu cũng có cùng dạng lỗi. PowerShell pipe mặc định có thể làm mất Unicode khi chuyển dữ liệu sang chương trình khác; đây là cơ chế tái hiện được trong phiên kiểm tra, chưa đủ chứng cứ xác nhận cách import trước đây.

## Kế hoạch và giới hạn

1. Thêm charset `utf8mb4` rõ ràng cho pool backend, `SET NAMES utf8mb4` trong SQL và `.editorconfig` UTF-8. Không chạy lại schema/seed, không đổi bảng hay API.
2. Công cụ `scripts/repair-seed-text.mjs` mặc định chỉ lập kế hoạch; chỉ khôi phục giá trị khớp duy nhất với literal gốc trong schema. Các mảng JSON giữ số, key, cấu trúc và giá trị khác. Trong audit log, chỉ khôi phục tên tác nhân đã đối chiếu ở đầu câu, giữ nguyên phần hành động còn lại.
3. File SQL riêng: `database/migrations/20261010_repair_seed_text.sql`. Mỗi UPDATE kiểm tra ID và toàn bộ byte cũ, giới hạn một hàng; giữ `updated_at`; không tự COMMIT. Không DROP/TRUNCATE/DELETE, không sửa số đo, mục tiêu số, credentials hoặc quyền.
4. Chế độ ghi chỉ cho phép `--apply-local` khi host là loopback VÀ hostname MySQL trùng máy hiện tại. Không hỗ trợ ghi Aiven/production. Nếu production cũng lỗi, cần audit và backup riêng, phê duyệt trước khi chạy SQL đã rà soát.
5. Trước mọi lần ghi: transaction InnoDB, khóa/đối chiếu từng giá trị cũ; sao lưu đầy đủ schema và dữ liệu tất cả bảng vào `database/backups/text-encoding-*/snapshot.json`, đọc lại xác minh checksum SHA-256 và xuất rollback SQL. Thư mục backup bị Git ignore vì chứa dữ liệu riêng tư.
6. Sau ghi và trước commit: so sánh từng trường của toàn bộ bảng với backup cộng đúng danh sách sửa; nếu có khác biệt ngoài kế hoạch thì rollback. Có lệnh rollback cục bộ từ backup, với guard không ghi đè dữ liệu người dùng đã sửa sau đó.
7. Không đoán nội dung tùy ý, không thay `?` đại trà. Những giá trị không có nguồn gốc xác định phải giữ lại và báo cần đối chiếu.

## Kết quả thực tế

- Đã áp dụng và commit 44 giá trị văn bản trên MySQL **cục bộ**, sau khi xác minh hostname MySQL trùng máy đang chạy. Không chạm Aiven/production.
- Backup đủ 8 bảng tại `database/backups/text-encoding-J7xoPA/`: `snapshot.json`, `snapshot.sha256`, `rollback.sql`. Checksum và đọc lại backup đều đạt; `git check-ignore` xác nhận backup không đưa vào Git.
- Đã so sánh toàn bộ các bảng trước commit: số hàng, số đo, giá trị bắt đầu/hiện tại/đích mục tiêu, các trường không sửa, mật khẩu, phân quyền, timestamp đều giữ nguyên. Chỉ 44 giá trị theo kế hoạch thay đổi.
- Kiểm tra riêng sau commit: 44 giá trị lưu thực tế khớp byte với kế hoạch, bao gồm JSON, đủ điều kiện guard để rollback. Không thực hiện rollback trên database thật vì sẽ đưa chữ lỗi trở lại; đây là kiểm tra guard chỉ đọc.
- Gọi `GET /api/goals` qua Express thật và MySQL cục bộ, với adapter chặn mọi truy vấn ghi: cả hai tên mục tiêu tiếng Việt đúng, response UTF-8, tiến độ vẫn **59% và 82%** như ảnh. Token kiểm tra chỉ tồn tại trong process, không in hoặc lưu.
- Audit sau sửa: client/connection/results/database `utf8mb4`; round-trip tiếng Việt và ký tự 4 byte đạt; không còn `?` hoặc U+FFFD trong các trường đã quét. Báo cáo `docs/TEXT-ENCODING-AUDIT.json`. Lần dry-run tiếp theo tìm 0 giá trị cần sửa, không ghi DB và không ghi đè file kế hoạch 44 giá trị đã xuất.
- `npm.cmd test`: **33 đạt, 0 thất bại**, bao gồm hồi quy hiện có, Unicode CRUD qua HTTP, phục hồi chuỗi đúng bản gốc, không đoán giá trị mơ hồ, JSON, audit actor và SQL guard.
- `npm.cmd run build` và `npm.cmd run build:client -- --base=/ --outDir build/qa-client`: đạt. Cảnh báo chunk >500 kB cũ vẫn còn, không phải lỗi build. Không thay các asset `dist-pages` đang được Git theo dõi.
- `node tests/browser-smoke.mjs`: đạt. Nhập tên mục tiêu tiếng Việt và ký tự 4 byte qua form thật, lưu vào kho QA, reload Dashboard/Goals vẫn đúng. Toàn bộ test nhắc nhở, 8 trang User ở 390/768/1440 px, 8 trang Admin, hồ sơ bệnh nhân, AI review, số đo/ghi chú, hai tab, API lỗi và JWT hết hạn vẫn đạt. Edge profile: `C:/Users/huylu/AppData/Local/Temp/vitaltrack-browser-Xm7xBF`.
- `node scripts/verify-backend-start.mjs`: cả API entry point và backend CJS khởi động thành công, ping 200, route bảo vệ 401, route thiếu 404, không kết nối DB trong phép thử này.

## File thay đổi trong lần sửa

`.editorconfig`, `server.js` (thêm duy nhất cấu hình charset trong pool cho lần sửa này), `schema.sql`, `database/schema.sql` (chỉ thêm SET NAMES, không thực thi), `scripts/audit-text-encoding.mjs`, `scripts/repair-seed-text.mjs`, `scripts/lib/text-encoding.mjs`, `database/migrations/20261010_repair_seed_text.sql`, `tests/text-encoding.test.js`, `tests/api.test.js`, `tests/browser-smoke.mjs`, báo cáo này và báo cáo audit JSON. Các thay đổi có sẵn từ đợt nâng cấp trước được giữ nguyên.

## Hoàn tác và triển khai

Nếu cần hoàn tác **riêng 44 giá trị đã sửa trên máy này**, lệnh là:

```powershell
node --env-file=.env scripts/repair-seed-text.mjs --rollback-local database/backups/text-encoding-J7xoPA
```

Lệnh có backup mới trước rollback, kiểm tra checksum backup cũ, điều kiện cùng máy và byte hiện tại; từ chối ghi đè nếu người dùng đã thay đổi nội dung kể từ lần sửa. Rollback sẽ đưa chuỗi lỗi cũ trở lại. Không reset toàn bộ workspace vì còn các thay đổi có sẵn.

Không chạy lại schema/seed để sửa chữ; file `database/schema.sql` cũ còn lệnh DROP từ trước, tuyệt đối không chạy lên dữ liệu đang dùng. Khi import SQL mới đã rà soát, mở file UTF-8 trực tiếp bằng công cụ database và đặt charset utf8mb4; tránh `Get-Content ... | mysql` với encoding mặc định. SQL sửa riêng dùng literal HEX ASCII nên không bị mất dấu khi qua terminal.

Chưa chạy GitHub Actions từ xa, chưa deploy hoặc kiểm chứng Vercel/Render/Aiven thật, nên không tuyên bố bảo toàn 100% mọi môi trường. Lỗi đã sửa trên database cục bộ; push code không tự sửa dữ liệu hỏng trong database khác. Nếu Aiven có cùng lỗi, phải backup, audit đúng database đó và phê duyệt kế hoạch SQL trước khi áp dụng. Không đưa thư mục backup, `.env` hoặc artifact QA lên GitHub.
