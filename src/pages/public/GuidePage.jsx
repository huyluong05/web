import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { PublicNavbar } from "../../components/layout/PublicNavbar";
import { PublicFooter } from "../../components/layout/PublicFooter";
import { Button } from "../../components/common/Button";
import {
  UserPlus,
  LogIn,
  Scale,
  Heart,
  Activity,
  LineChart,
  Target,
  TrendingUp,
  Droplets,
  Footprints,
  LayoutDashboard,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export const GuidePage = () => {
  const guides = [
    {
      id: "step-1",
      num: "01",
      title: "Cách đăng ký tài khoản mới",
      icon: UserPlus,
      color: "emerald",
      steps: [
        'Truy cập trang Đăng ký từ nút "Bắt đầu ngay" hoặc menu trên thanh điều hướng.',
        "Nhập đầy đủ Họ và tên, địa chỉ Email hợp lệ và Mật khẩu (tối thiểu 6 ký tự).",
        "Nhập lại Mật khẩu xác nhận để đảm bảo không gõ nhầm.",
        'Bấm "Đăng ký tài khoản". Hệ thống sẽ tự động khởi tạo dữ liệu mẫu ban đầu và đưa bạn đến Dashboard.',
      ],
      tip: "Email đăng ký là duy nhất trong hệ thống và sẽ được sử dụng cho mỗi lần đăng nhập.",
    },
    {
      id: "step-2",
      num: "02",
      title: "Cách đăng nhập vào hệ thống",
      icon: LogIn,
      color: "slate",
      steps: [
        "Truy cập trang Đăng nhập (/login).",
        "Nhập địa chỉ Email và Mật khẩu bạn đã tạo khi đăng ký.",
        'Nhấn "Đăng nhập". Bạn sẽ nhận được JWT Token xác thực an toàn và chuyển đến trang chính.',
        "Đối với tài khoản Quản trị viên (Admin), hệ thống sẽ cấp quyền vào khu vực Admin Portal riêng biệt.",
      ],
      tip: 'Bạn có thể sử dụng các nút "Đăng nhập nhanh" tại trang Login để thử nghiệm tài khoản User hoặc Admin có sẵn.',
    },
    {
      id: "step-3",
      num: "03",
      title: "Cách nhập chỉ số Cân nặng (kg)",
      icon: Scale,
      color: "emerald",
      steps: [
        'Tại Dashboard hoặc trang "Chỉ số sức khỏe", nhấn nút "+ Ghi nhận chỉ số".',
        "Nhập số đo cân nặng hiện tại tính bằng kilogram (ví dụ: 68.5). Cho phép số thập phân (1 chữ số sau dấu phẩy).",
        "Thời gian ghi nhận được tự động điền theo thời điểm hiện tại hoặc bạn có thể chọn ngày giờ trong quá khứ.",
        'Bấm "Lưu chỉ số". Dữ liệu sẽ lưu vào database và cập nhật biểu đồ ngay lập tức.',
      ],
      tip: "Nên đo cân nặng vào buổi sáng sau khi thức dậy và đi vệ sinh để có kết quả chính xác nhất.",
    },
    {
      id: "step-4",
      num: "04",
      title: "Cách nhập chỉ số Huyết áp (mmHg)",
      icon: Heart,
      color: "rose",
      steps: [
        "Trong form ghi nhận chỉ số, điền hai giá trị: Huyết áp tâm thu (Systolic - chỉ số trên) và Huyết áp tâm trương (Diastolic - chỉ số dưới).",
        "Ví dụ: 118 (tâm thu) và 76 (tâm trương).",
        "Hệ thống sẽ tự động so sánh với ngưỡng y tế chuẩn: Huyết áp lý tưởng là dưới 120/80 mmHg.",
      ],
      tip: "Nên ngồi nghỉ ngơi thư giãn 5 phút trước khi tiến hành đo huyết áp.",
    },
    {
      id: "step-5",
      num: "05",
      title: "Cách nhập chỉ số Nhịp tim (bpm)",
      icon: Activity,
      color: "amber",
      steps: [
        "Điền số nhịp đập mỗi phút của tim khi ở trạng thái nghỉ ngơi (Resting Heart Rate).",
        "Ví dụ: 74 bpm. Ngưỡng bình thường của người trưởng thành khỏe mạnh dao động từ 60 đến 100 bpm.",
        'Bạn có thể nhập thêm ghi chú ngữ cảnh (ví dụ: "Đo sau 15 phút tập yoga").',
      ],
      tip: "Nhịp tim nghỉ ngơi thấp hơn thường phản ánh cơ tim khỏe mạnh và hiệu quả tuần hoàn tốt.",
    },
    {
      id: "step-6",
      num: "06",
      title: "Cách xem biểu đồ xu hướng (Analytics)",
      icon: LineChart,
      color: "sky",
      steps: [
        'Truy cập mục "Analytics" (Biểu đồ) trên menu điều hướng.',
        "Chọn khoảng thời gian theo dõi: 7 Ngày (xem biến thiên tuần), 30 Ngày (xem xu hướng tháng) hoặc 3 Tháng.",
        "Rê chuột hoặc chạm vào các cột/điểm dữ liệu để xem thông số chi tiết của từng ngày.",
        "Xem các phân tích so sánh: Mức trung bình, độ chênh lệch tăng/giảm so với các mốc trước đó.",
      ],
      tip: "Biểu đồ giúp bạn nhìn thấy bức tranh tổng thể dài hạn thay vì chỉ lo lắng về dao động nhỏ trong ngày.",
    },
    {
      id: "step-7",
      num: "07",
      title: "Cách tạo mục tiêu sức khỏe mới",
      icon: Target,
      color: "emerald",
      steps: [
        'Truy cập trang "Goals" (Mục tiêu sức khỏe) và nhấn "+ Tạo mục tiêu mới".',
        'Đặt tên mục tiêu (ví dụ: "Giảm cân về 65kg" hoặc "Duy trì huyết áp 118 mmHg").',
        "Chọn loại chỉ số tương ứng: Cân nặng, Huyết áp, Nhịp tim hoặc Thời gian vận động.",
        "Điền giá trị ban đầu (Start Value) và giá trị mong muốn đạt được (Target Value).",
        'Bấm "Tạo mục tiêu".',
      ],
      tip: "Hãy chia nhỏ mục tiêu thành các mốc khả thi (ví dụ giảm 1-2kg mỗi tháng) để duy trì động lực tốt hơn.",
    },
    {
      id: "step-8",
      num: "08",
      title: "Cách theo dõi và cập nhật tiến độ mục tiêu",
      icon: TrendingUp,
      color: "emerald",
      steps: [
        "Tại danh sách mục tiêu, hệ thống hiển thị thanh Progress Bar cùng tỷ lệ % hoàn thành tự động.",
        "Khi bạn ghi nhận chỉ số sức khỏe mới (ví dụ cân nặng giảm), tiến độ mục tiêu sẽ tự động được cập nhật.",
        'Bạn cũng có thể bấm "Cập nhật tiến độ" để chỉnh sửa thủ công giá trị hiện tại.',
        'Khi đạt 100%, mục tiêu sẽ tự động chuyển sang trạng thái "Hoàn thành" (Completed).',
      ],
      tip: "Công thức tính: % = (Độ biến đổi đã đạt được / Tổng khoảng cách cần thay đổi) * 100%.",
    },
    {
      id: "step-9",
      num: "09",
      title: "Cách tạo và quản lý nhắc nhở Uống nước",
      icon: Droplets,
      color: "sky",
      steps: [
        'Truy cập trang "Reminders" (Nhắc nhở) và bấm "+ Thêm nhắc nhở".',
        "Chọn loại nhắc nhở: 💧 Uống nước (Water).",
        'Nhập nội dung nhắc (ví dụ: "Uống 500ml nước ấm buổi sáng", "Uống nước sau giờ làm việc").',
        "Chọn giờ nhắc nhở trong ngày (định dạng Giờ : Phút, ví dụ 08:00 AM hoặc 14:30 PM).",
        "Bạn có thể gạt công tắc Bật/Tắt trạng thái hoạt động bất kỳ lúc nào.",
      ],
      tip: "Uống đủ 2 lít nước mỗi ngày giúp tăng cường trao đổi chất và duy trì độ ổn định của huyết áp.",
    },
    {
      id: "step-10",
      num: "10",
      title: "Cách tạo nhắc nhở Tập thể dục",
      icon: Footprints,
      color: "amber",
      steps: [
        'Trong trang Nhắc nhở, nhấn "+ Thêm nhắc nhở" và chọn loại 🏃 Tập thể dục (Exercise).',
        'Nhập tên hoạt động rèn luyện (ví dụ: "Đi bộ nhẹ 30 phút", "Tập thể dục nhịp điệu").',
        "Chọn khung giờ tập luyện phù hợp (ví dụ 18:00 PM sau giờ tan sở).",
        'Lưu nhắc nhở. Nhắc nhở sẽ xuất hiện tại bảng "Reminders" trên Dashboard tổng quan hàng ngày.',
      ],
      tip: "Duy trì ít nhất 150 phút vận động cường độ vừa phải mỗi tuần theo khuyến nghị của Tổ chức Y tế Thế giới (WHO).",
    },
    {
      id: "step-11",
      num: "11",
      title: "Cách sử dụng Dashboard tổng quan",
      icon: LayoutDashboard,
      color: "slate",
      steps: [
        'Dashboard là trung tâm điều khiển hàng ngày giúp bạn trả lời câu hỏi: "Hôm nay sức khỏe của tôi như thế nào?".',
        "3 Thẻ chỉ số trên cùng hiển thị số đo mới nhất của Cân nặng, Huyết áp, Nhịp tim kèm trạng thái chênh lệch.",
        "Khu vực Biểu đồ ở giữa hiển thị hành trình thay đổi trong 30 ngày qua.",
        "Cột bên phải hiển thị danh sách Mục tiêu đang hoạt động cùng thanh % tiến độ.",
        "Hộp tối màu nổi bật ở góc dưới hiển thị các Lịch nhắc nhở sắp tới trong ngày kèm ô đánh dấu.",
      ],
      tip: 'Nhấn nút "+ Ghi nhận chỉ số" ở góc trên bên phải Dashboard để cập nhật nhanh bất kỳ lúc nào!',
    },
  ];

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900">
      <PublicNavbar />

      {/* Header Banner */}
      <section className="pt-32 pb-20 bg-white border-b border-slate-100/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-50/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary-600 bg-primary-50 px-3.5 py-1.5 rounded-full border border-primary-200/60 mb-6 inline-block">
            Tài liệu hướng dẫn
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
            Cẩm nang sử dụng <br className="hidden sm:inline" />
            <span className="text-gradient">VitalTrack</span>
          </h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            Hướng dẫn chi tiết từ A đến Z toàn bộ 11 nghiệp vụ của hệ thống theo dõi sức khỏe cá nhân. Dành cho người mới bắt đầu.
          </p>
        </div>
      </section>

      {/* Main Guide Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex-1">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-8 lg:space-y-10"
        >
          {guides.map((item) => (
            <motion.div
              variants={fadeUp}
              key={item.id}
              id={item.id}
              className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100/50 shadow-sm shrink-0">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1 block">
                      Bước {item.num}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Step Steps */}
              <div className="space-y-4 mb-8">
                {item.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 text-[15px] text-slate-600 leading-relaxed font-medium"
                  >
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-slate-200">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {/* Tip Pill */}
              <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100/60 flex items-start gap-3 text-sm text-slate-700 font-medium">
                <CheckCircle className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                <p>
                  <strong className="font-bold text-slate-900 mr-1.5">
                    Lời khuyên:
                  </strong>
                  {item.tip}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 p-10 sm:p-16 rounded-[2rem] bg-slate-950 text-white text-center flex flex-col items-center justify-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-[60px]" />
          <div className="relative z-10">
            <h3 className="text-white text-3xl sm:text-4xl font-bold mb-4 tracking-tight leading-tight">
              Sẵn sàng để bắt đầu <br className="hidden sm:inline" /> theo dõi sức khỏe?
            </h3>
            <p className="text-slate-400 text-base max-w-lg mb-10 font-medium mx-auto">
              Áp dụng các hướng dẫn trên ngay hôm nay bằng cách tạo tài khoản miễn
              phí trên VitalTrack.
            </p>
            <Link to="/register">
              <Button
                variant="primary"
                size="lg"
                className="px-8 h-12 rounded-lg text-base shadow-lg shadow-primary-600/20"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Đăng ký tài khoản ngay
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>

      <PublicFooter />
    </div>
  );
};
