# Sửa lỗi ReminderNotice — 10/10/2026

## Nguyên nhân và phạm vi

`notice` khởi tạo bằng `null`. Khi danh sách nhắc nhở có phần tử nhưng không có lịch cần hiển thị (đã tắt, chưa đến giờ, đã hoàn thành, không lặp hôm nay hoặc đã xem), nhánh `else if` vẫn truy cập `notice.id`, gây lỗi React và mất giao diện. Đã tái hiện đúng `TypeError: Cannot read properties of null (reading 'id')` trên bản build trước sửa bằng Edge headless và một lịch đã tắt.

## File thay đổi trong lần sửa này

- `src/components/common/ReminderNotice.jsx`: chỉ đọc `notice.id` khi `notice` tồn tại; chặn thao tác đóng khi không có thông báo. Giữ logic lịch, múi giờ, chống nhắc trùng, điều hướng và cập nhật khi lịch bị hoàn thành/tắt/xóa.
- `index.html`: thêm `mobile-web-app-capable`, giữ thẻ Apple để tương thích.
- `tests/browser-smoke.mjs`: bổ sung kiểm thử React chạy thật cho danh sách rỗng, đã tắt, chưa đến giờ, đã hoàn thành, không lặp hôm nay; hiển thị đúng lịch đến giờ; đóng và reload; hoàn thành; tắt; xóa; mở chức năng. Kiểm tra xác nhận lưu từ Express và trạng thái dữ liệu QA sau thao tác.
- `.github/workflows/ci.yml`: chạy script `npm test` hiện có; bỏ cơ chế bỏ qua test khi không có `test:ci` hoặc test thất bại.
- Báo cáo này.

Không sửa backend/API/schema, không đọc hay ghi database thật trong lần sửa này. Không xóa chức năng, không sửa cấu hình bí mật, không commit/push/deploy. Những thay đổi từ đợt nâng cấp trước vẫn giữ nguyên.

## Kết quả thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| Tái hiện trước sửa | Thất bại đúng lỗi `null.id` trong ảnh |
| `npm.cmd test` | 26 đạt, 0 thất bại; domain và HTTP Express dùng SQL double |
| `npm.cmd run build` | Đạt frontend và backend CJS |
| `npm.cmd run build:client -- --base=/ --outDir build/qa-client` | Đạt bản frontend dùng base `/` |
| `node tests/browser-smoke.mjs` | Đạt toàn bộ tình huống nhắc nhở mới và hồi quy hiện có |
| Hồi quy giao diện | 8 trang User ở 390/768/1440 px và 8 trang Admin; không runtime exception; dossier, sửa hồ sơ, AI review, ghi nhận/ghi chú, mục tiêu, đồng bộ hai tab, API lỗi, JWT hết hạn |
| `node scripts/verify-backend-start.mjs` | Cả API entry point và backend đã bundle khởi động, ping 200, route bảo vệ 401, route thiếu 404; không kết nối DB |
| `git diff --check` | Đạt |

Profile Edge kiểm thử sau sửa: `C:/Users/huylu/AppData/Local/Temp/vitaltrack-browser-ITrM1A`. Build vẫn có cảnh báo kích thước JS lớn hơn 500 kB; không phải lỗi build. Lệnh build đầu tiên bị truyền nhầm tham số `--outDir` sang esbuild; đã chạy lại đúng hai lệnh ở bảng và cả hai thành công. Không thay đổi các file build `dist-pages` đang được Git theo dõi.

## Trước khi triển khai và hoàn tác

Chưa chạy GitHub Actions từ xa hoặc kiểm chứng Vercel/Render/Aiven thật. Vì vậy kết quả trên xác nhận phạm vi kiểm thử local, không phải bảo đảm 100% mọi môi trường production. Khi đưa code lên GitHub, phải kèm các file nguồn/test đã bổ sung từ đợt nâng cấp trước để CI/build không thiếu module; không đưa `.env`, `node_modules` hoặc artifact QA lên repo. Chạy lại CI và kiểm tra trên staging với tài khoản có lịch đã tắt, lịch chưa đến giờ và lịch đã xem trước khi production.

Không cần migration cho bản sửa này. Muốn hoàn tác riêng bản sửa: bỏ điều kiện `notice &&`, guard đầu `dismiss`, thẻ meta mới và khôi phục bước test CI từ diff của bản sửa; các thay đổi này không ảnh hưởng dữ liệu. Hoàn tác sẽ làm lỗi cũ có thể xuất hiện trở lại. Không dùng reset toàn bộ workspace vì còn các thay đổi nâng cấp trước.
