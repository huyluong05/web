import { aiApi } from "../api/client";
/**
 * =========================================================================
 * 🤖 TRUNG TÂM DỊCH VỤ TRÍ TUỆ NHÂN TẠO (AI SERVICE CLIENT LAYER)
 * =========================================================================
 *
 * Đây là tầng trung gian (Abstraction Layer) kết nối giữa giao diện người dùng
 * và bộ não xử lý AI.
 *
 * 📌 HƯỚNG DẪN DÀNH CHO BẠN KHI TỰ THÊM CODE AI:
 * - Bạn có thể gọi trực tiếp API Backend (`aiApi.getDiagnosis(payload)`).
 * - Hoặc nếu muốn gọi Client-Side AI SDK (như Gemini Web SDK / On-device WebLLM / TensorFlow.js),
 *   bạn có thể thay thế hoặc mở rộng hàm `requestAIDiagnosis` bên dưới.
 * =========================================================================
 */
export async function requestAIDiagnosis(payload) {
  // =======================================================================
  // 💡 CHỖ TRỐNG ĐỂ BẠN THÊM TIỀN XỬ LÝ (PRE-PROCESSING) HOẶC CUSTOM AI PROMPT:
  // =======================================================================
  // Ví dụ: Làm giàu dữ liệu, chuẩn hóa tên thuốc, gắn thẻ ngữ cảnh đặc thù...
  // =======================================================================
  const response = await aiApi.getDiagnosis(payload);
  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Không thể nhận phản hồi từ mô hình AI.",
    );
  }
  // =======================================================================
  // 💡 CHỖ TRỐNG ĐỂ BẠN THÊM HẬU XỬ LÝ (POST-PROCESSING) KẾT QUẢ AI:
  // =======================================================================
  // Ví dụ: Format lại văn bản y khoa, phân loại cảnh báo đỏ khẩn cấp...
  // =======================================================================
  return response.data;
}
export async function fetchAIHistory() {
  const response = await aiApi.getHistory();
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Không thể tải lịch sử phân tích AI.');
}
export async function sendChatMessageToAI(message, history) {
  const response = await aiApi.chatWithDoctor({ message, history });
  if (!response.success || !response.data) {
    throw new Error(response.message || "Không thể kết nối với công cụ giải thích AI.");
  }
  return response.data;
}
