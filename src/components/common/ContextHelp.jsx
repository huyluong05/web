import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MEDICAL_SOURCES } from '../../data/medicalSources';
const HELP = {
  '/login': ['Nhập email và mật khẩu đã đăng ký, rồi chọn Đăng nhập. Có thể dùng biểu tượng con mắt để kiểm tra mật khẩu. Không chia sẻ mật khẩu hoặc mã xác thực.', 'Đăng nhập Google, Apple và OTP chưa được kết nối dịch vụ xác thực thật. Dùng email/mật khẩu để truy cập; liên hệ quản trị viên nếu cần khôi phục tài khoản.'],
  '/register': ['Nhập họ tên, email bạn sử dụng và mật khẩu đủ dài theo yêu cầu trên biểu mẫu. Kiểm tra lại email và xác nhận mật khẩu trước khi đăng ký.', 'Sau khi vào ứng dụng, bạn có thể ghi nhận các số đo đầu tiên hoặc chọn Để sau. Hồ sơ thiếu số đo sẽ để trống để bạn tự bổ sung.'],
  '/dashboard': ['Các thẻ dùng số đo hợp lệ mới nhất của từng chỉ số, kèm thời điểm đo. Dữ liệu cũ được đánh dấu. Chọn Ghi nhận để thêm số đo thực tế.'],
  '/health': ['1. Đo bằng thiết bị theo hướng dẫn của nhà sản xuất. 2. Nhập đúng số đo và giờ đo. 3. Ghi bối cảnh nếu cần, rồi chọn Lưu.', 'Tâm thu là số trên, tâm trương là số dưới của huyết áp. bpm là số nhịp tim mỗi phút. Mở Chỉnh sửa để xem toàn bộ ghi chú; sửa số đo cũ không đổi thứ tự theo giờ đo.'],
  '/profile': ['Cân nặng hiện tại lấy từ lịch sử đo. Cân nặng ban đầu là mốc bạn khai báo; cân nặng mục tiêu là giá trị bạn mong muốn. Muốn đổi cân nặng hiện tại, hãy tạo một số đo mới.', 'Nhấn Lưu sau khi kiểm tra. Chỉ nhập thông tin bạn biết; không cần điền số liệu ước đoán.'],
  '/analytics': ['Chọn khoảng thời gian và loại biểu đồ. Chạm hoặc đưa chuột lên điểm đo để xem số liệu và ghi chú.', 'Phân nhóm chỉ số theo tài liệu tham chiếu không phải chẩn đoán bệnh. Biểu đồ chỉ dùng số đo có dữ liệu; khung giờ hiển thị theo múi giờ trình duyệt.'],
  '/goals': ['Ghi nhận chỉ số trước, chọn Tạo mục tiêu rồi kiểm tra giá trị bắt đầu được điền từ database. Bạn có thể điều chỉnh mốc bắt đầu trước khi lưu.', 'Mốc bắt đầu được giữ lại. Số đo mới cập nhật giá trị hiện tại; tiến độ chỉ tăng khi đi đúng hướng mục tiêu. Huyết áp dùng giá trị tâm thu. Vận động nhập tiến độ thủ công.'],
  '/reminders': ['Chọn loại nhắc, giờ và ngày lặp. Bật/tắt lịch khác với đánh dấu đã hoàn thành hôm nay.', 'Nhắc trong website khi đang mở. Chưa có thông báo nền khi đóng website. Lịch nâng cao và hoàn thành cần quản trị viên áp dụng migration đã phê duyệt.'],
  '/devices': ['Đăng ký tên và loại thiết bị trước; địa chỉ MAC có thể bỏ trống. Mở “Địa chỉ MAC là gì?” nếu cần.', 'Đăng ký chỉ lưu thông tin. Ghép nối Bluetooth phải do phần cứng và trình duyệt hỗ trợ. Hiện chưa có bộ kết nối BLE trực tiếp; dùng ứng dụng nhà sản xuất hoặc nhập số đo thủ công.'],
  '/ai-diagnostics': ['Chọn chỉ số đã ghi nhận hoặc nhập riêng cho lần phân tích; phần nhập riêng không lưu vào lịch sử đo. Mô tả triệu chứng rồi chọn Phân tích.', 'Kết quả đối chiếu chỉ số và giải thích AI mang tính tham khảo, không chẩn đoán, kê thuốc hoặc loại trừ bệnh. Nếu có triệu chứng nguy hiểm, hãy liên hệ cấp cứu địa phương.'],
};
export function ContextHelp() {
  const { pathname } = useLocation(), lines = HELP[pathname];
  if (!lines) return null;
  return <details className="rounded-xl border border-primary-100 bg-primary-50/50 p-3 text-sm text-slate-700 mb-4">
    <summary className="cursor-pointer font-semibold text-primary-800">Hướng dẫn thao tác trang này</summary>
    <div className="mt-3 space-y-2">{lines.map(line => <p key={line}>{line}</p>)}<Link className="text-primary-700 underline" to="/guide">Mở hướng dẫn đầy đủ</Link>
      {['/analytics', '/ai-diagnostics'].includes(pathname) && <p>Nguồn tham chiếu: {MEDICAL_SOURCES.map(s => <a key={s.url} className="underline mr-2" href={s.url} target="_blank" rel="noreferrer">{s.organization} — {s.title} ({s.updated})</a>)}</p>}
    </div>
  </details>;
}
