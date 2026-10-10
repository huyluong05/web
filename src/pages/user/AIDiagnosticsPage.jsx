import React, { useState, useEffect, useRef } from 'react';
import { healthApi } from '../../api/client';
import { requestAIDiagnosis, fetchAIHistory, sendChatMessageToAI } from '../../services/aiService';
import { Sparkles, Brain, Activity, Heart, AlertTriangle, CheckCircle2, Clock, Code2, Stethoscope, ChevronDown, ChevronUp, RefreshCw, ShieldAlert, Flame, Salad, Moon, Plus, MessageSquare, Send, Bot, User as UserIcon, ShieldCheck, Check } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { motion, AnimatePresence } from 'motion/react';
import { MEDICAL_SOURCES, MEDICAL_DISCLAIMER } from '../../data/medicalSources';
import { useDataSync } from '../../hooks/useDataSync';
import { HealthDataStatus } from '../../components/common/HealthDataStatus';

const COMMON_SYMPTOMS = [
  'Đau đầu', 'Chóng mặt', 'Hoa mắt', 'Hồi hộp / Tim đập nhanh', 
  'Tức ngực nhẹ', 'Khó thở khi gắng sức', 'Mất ngủ / Khó vào giấc', 
  'Mệt mỏi / Uể oải', 'Đau mỏi vai gáy', 'Tê bì đầu ngón tay chân', 
  'Khát nước nhiều', 'Tiểu đêm',
];

const QUICK_PROMPTS = [
  'Huyết áp 135/85 mmHg có phải là tiền tăng huyết áp không?',
  'Chế độ ăn DASH giảm huyết áp và mỡ máu gồm những gì?',
  'Làm sao để ổn định nhịp tim khi bị hồi hộp, lo âu?',
  'Cần lưu ý gì khi tập thể dục cho người có chỉ số huyết áp cao?',
];

export const AIDiagnosticsPage = () => {
  const [activeTab, setActiveTab] = useState('assessment');
  
  // Input states for assessment
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [notes, setNotes] = useState('');
  const [useRealVitals, setUseRealVitals] = useState(true);
  const [latestRecord, setLatestRecord] = useState(null);
  
  // Manual vitals override
const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weight, setWeight] = useState('');
  const [current, setCurrent] = useState({});
  
  // Lifestyle context
const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState('moderate');
  const [activityLevel, setActivityLevel] = useState('light');
  
  // Diagnosis State
const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Chat State
const [chatMessages, setChatMessages] = useState([
    {
      id: 'init-1',
      role: 'model',
      text: 'Xin chào! Tôi là công cụ hỗ trợ giải thích chỉ số VitalTrack. Kết quả chỉ mang tính tham khảo, không thay thế bác sĩ. Hãy chọn chỉ số thực tế và xem thời điểm đo trước khi phân tích.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  const fetchVitals = async () => {
    const res = await healthApi.getLatest();
    if (!res.success) { setErrorMessage(res.message); return; }
    const cur = res.data.current ?? {};
    setCurrent(cur);
    setLatestRecord(res.data.latest ? { ...res.data.latest, weight: cur.weight?.value ?? null, systolic: cur.blood_pressure?.value ?? null, diastolic: cur.blood_pressure?.diastolic ?? null, heart_rate: cur.heart_rate?.value ?? null } : null);
  };
  useEffect(() => {
    fetchVitals();
    fetchAIHistory().then(setHistory).catch(err => setErrorMessage(err.message));
  }, []);
  useDataSync(fetchVitals, ['health'], true);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const addCustomSymptom = (e) => {
    e.preventDefault();
    const val = customSymptomInput.trim();
    if (val && !selectedSymptoms.includes(val)) {
      setSelectedSymptoms([...selectedSymptoms, val]);
      setCustomSymptomInput('');
    }
  };

  const handleRunDiagnosis = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const payload = {
        symptoms: selectedSymptoms,
        notes: notes.trim() || undefined,
        use_database: useRealVitals,
        recentVitals: {
          systolic: systolic === '' ? null : Number(systolic),
          diastolic: diastolic === '' ? null : Number(diastolic),
          heart_rate: heartRate === '' ? null : Number(heartRate),
          weight: weight === '' ? null : Number(weight),
        },
        lifestyle: { sleepHours, stressLevel, activityLevel, },
      };
      
      const res = await requestAIDiagnosis(payload);
      setResult(res);
      setHistory((prev) => [res, ...prev]);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể thực hiện phân tích AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customText) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading) return;
    
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput('');
    setChatLoading(true);
    
    try {
      const historyPayload = chatMessages.map((m) => ({ role: m.role, text: m.text }));
      const res = await sendChatMessageToAI(userMsg.text, historyPayload);
      const modelMsg = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ Xin lỗi, không thể kết nối tới mô hình AI: ${err.message || 'Lỗi không xác định'}. Vui lòng thử lại sau giây lát.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const getRiskBadge = (level, score) => {
    switch (level) {
      case 'high':
      case 'critical':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px] uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse"/>
            <span>Cần hỗ trợ y tế</span>
          </div>
        );
      case 'moderate':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px] uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500"/>
            <span>Cần theo dõi thêm</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px] uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>
            <span>Chưa phát hiện ngưỡng cảnh báo trong dữ liệu đã có</span>
          </div>
        );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col flex-1 pb-8"
    >
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-2 border border-indigo-100">
            <Sparkles className="w-3 h-3"/>
            <span>Trợ lý Y khoa AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            AI Phân Tích & Giải Thích Chỉ Số
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5 max-w-2xl">
            Tích hợp Google Gemini AI để phân tích sinh trắc y khoa và tư vấn sức khỏe trực tuyến
          </p>
        </div>
      </header>

      {/* Tabs Navigation */}
      <details className="mb-4 p-4 border border-amber-200 rounded-xl bg-amber-50 text-sm text-slate-700"><summary className="cursor-pointer font-semibold">Giới hạn và nguồn tham khảo đã xác minh</summary><p className="mt-2">{MEDICAL_DISCLAIMER}</p><p className="mt-2">Chưa có đánh giá độ chính xác thực nghiệm. Mức cảnh báo không phải xác suất mắc bệnh; chế độ quy tắc và giải thích Gemini được ghi rõ trong kết quả.</p><ul className="mt-2 space-y-2">{MEDICAL_SOURCES.map(source => <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.organization} — {source.title}</a><p className="text-xs">Tài liệu cập nhật: {source.updated}; xác minh: {source.verified}.</p></li>)}</ul></details>
      <HealthDataStatus current={current} />
      {result && <p className="my-3 text-sm text-slate-600">Chế độ: {result.engine === 'reference-rules' ? 'Đối chiếu quy tắc tham chiếu' : 'Giải thích Gemini kết hợp quy tắc tham chiếu'}. {result.aiUnavailable && 'AI tạm không khả dụng; kết quả này dùng quy tắc tham chiếu.'} {result.limitations}</p>}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('assessment')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === 'assessment' 
              ? 'bg-slate-900 text-white' 
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <Brain className="w-4 h-4 shrink-0"/> Đánh giá Lâm sàng
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-md font-semibold text-sm transition-colors cursor-pointer ${
            activeTab === 'chat' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0"/> Hỏi đáp Trợ lý chỉ số
        </button>
      </div>

      {/* Error notification */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mb-6 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4"/>{errorMessage}</div>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-100 rounded transition-colors">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'assessment' ? (
        /* TAB 1: CLINICAL ASSESSMENT */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Assessment Input Form (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200  space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                  <Stethoscope className="w-5 h-5"/>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">Dữ liệu đầu vào</h3>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Triệu chứng & Sinh trắc</p>
                </div>
              </div>

              {/* Symptoms Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Triệu chứng lâm sàng
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] ml-2 font-bold">{selectedSymptoms.length}</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_SYMPTOMS.map((symptom) => {
                    const isSelected = selectedSymptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors border cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {symptom}
                      </button>
                    );
                  })}
                </div>
                
                {/* Add Custom Symptom */}
                <form onSubmit={addCustomSymptom} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Thêm triệu chứng khác..."
                    value={customSymptomInput}
                    onChange={(e) => setCustomSymptomInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-medium rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <Button type="submit" variant="secondary" className="px-3 rounded-md" disabled={!customSymptomInput.trim()}>
                    <Plus className="w-4 h-4"/>
                  </Button>
                </form>
              </div>

              {/* Vitals Source Selector */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-slate-600">
                    Chỉ số sinh tồn
                  </label>
                  {latestRecord && (
                    <button
                      type="button"
                      onClick={() => setUseRealVitals(!useRealVitals)}
                      className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 underline"
                    >
                      {useRealVitals ? 'Chuyển sang nhập thủ công' : 'Dùng bản ghi mới nhất'}
                    </button>
                  )}
                </div>

                {useRealVitals && latestRecord ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 bg-slate-50 rounded-md border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-0.5">Huyết áp</span>
                      <span className="font-bold text-sm text-slate-900">{latestRecord.systolic}/{latestRecord.diastolic}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-md border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-0.5">Nhịp tim</span>
                      <span className="font-bold text-sm text-slate-900">{latestRecord.heart_rate}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-md border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-0.5">Cân nặng</span>
                      <span className="font-bold text-sm text-slate-900">{latestRecord.weight}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-md border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-0.5">Ngày đo</span>
                      <span className="font-bold text-xs text-slate-900 truncate block mt-0.5">{new Date(latestRecord.recorded_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">Tâm thu / Tâm trương</label>
                      <div className="flex gap-2">
                        <input type="number" value={systolic} onChange={(e) => setSystolic(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm rounded-md border border-slate-200 outline-none focus:border-indigo-500"/>
                        <input type="number" value={diastolic} onChange={(e) => setDiastolic(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm rounded-md border border-slate-200 outline-none focus:border-indigo-500"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">Nhịp tim / Cân nặng</label>
                      <div className="flex gap-2">
                        <input type="number" value={heartRate} onChange={(e) => setHeartRate(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm rounded-md border border-slate-200 outline-none focus:border-indigo-500" placeholder="bpm"/>
                        <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm rounded-md border border-slate-200 outline-none focus:border-indigo-500" placeholder="kg"/>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lifestyle Context */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-3">Thông tin lối sống</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <select value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))} className="w-full px-2 py-2 text-xs font-medium rounded-md border border-slate-200 bg-white outline-none focus:border-indigo-500">
                      <option value={5}>Ngủ &lt;5h</option>
                      <option value={6}>Ngủ 6h</option>
                      <option value={7}>Ngủ 7h</option>
                      <option value={8}>Ngủ 8h</option>
                    </select>
                  </div>
                  <div>
                    <select value={stressLevel} onChange={(e) => setStressLevel(e.target.value)} className="w-full px-2 py-2 text-xs font-medium rounded-md border border-slate-200 bg-white outline-none focus:border-indigo-500">
                      <option value="low">Ít áp lực</option>
                      <option value="moderate">Bình thường</option>
                      <option value="high">Căng thẳng</option>
                    </select>
                  </div>
                  <div>
                    <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="w-full px-2 py-2 text-xs font-medium rounded-md border border-slate-200 bg-white outline-none focus:border-indigo-500">
                      <option value="sedentary">Ít vận động</option>
                      <option value="light">Đi bộ nhẹ</option>
                      <option value="active">Chơi thể thao</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Ghi chú bổ sung
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Triệu chứng khác, thời điểm xuất hiện..."
                  className="w-full px-3 py-2 text-sm font-medium rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <Button
                type="button"
                onClick={handleRunDiagnosis}
                disabled={loading}
                className="w-full py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin"/><span>Đang phân tích...</span></>
                ) : (
                  <><Sparkles className="w-4 h-4"/><span>Phân tích AI</span></>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: AI Analysis Result (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {result ? (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 sm:p-6 rounded-lg border border-slate-200  space-y-5">
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-5 h-5 text-indigo-600"/>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">Báo cáo Phân tích AI</h2>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Thời điểm phân tích: {new Date(result.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {getRiskBadge(result.riskLevel, result.riskScore)}
                </div>

                {/* Summary Box */}
                <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-medium">
                  {result.summary}
                </div>

                {/* Possible Conditions */}
                {result.possibleConditions && result.possibleConditions.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500"/> Dự báo bệnh lý
                    </h3>
                    <div className="space-y-2">
                      {result.possibleConditions.map((cond, idx) => (
                        <div key={idx} className="p-3 rounded-md bg-white border border-slate-200 ">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-sm text-slate-800">{cond.name}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                              Chưa có ước tính xác suất được kiểm chứng
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{cond.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Grid */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500"/> Khuyến nghị & Kế hoạch
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Immediate actions */}
                    <div className="p-4 rounded-md bg-white border border-slate-200 ">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
                        <Flame className="w-4 h-4 text-amber-500"/> Cần làm ngay
                      </div>
                      <ul className="space-y-2 text-[13px] font-medium text-slate-600">
                        {result.recommendations.immediateActions.map((act, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold mt-0.5">•</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Dietary tips */}
                    <div className="p-4 rounded-md bg-white border border-slate-200 ">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
                        <Salad className="w-4 h-4 text-emerald-500"/> Dinh dưỡng
                      </div>
                      <ul className="space-y-2 text-[13px] font-medium text-slate-600">
                        {result.recommendations.dietaryTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Lifestyle advice */}
                  <div className="p-4 rounded-md bg-white border border-slate-200 ">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
                      <Moon className="w-4 h-4 text-blue-500"/> Lối sống
                    </div>
                    <ul className="space-y-2 text-[13px] font-medium text-slate-600">
                      {result.recommendations.lifestyleAdvice.map((adv, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* When to see doctor */}
                  <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-900 font-medium">
                    <p className="font-bold flex items-center gap-2 mb-1.5 text-rose-700">
                      <Stethoscope className="w-4 h-4"/> Lời khuyên khám bệnh
                    </p>
                    <p className="leading-relaxed text-[13px]">{result.recommendations.whenToSeeDoctor}</p>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-500 italic leading-relaxed font-medium">
                  {result.disclaimer}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white p-8 sm:p-12 rounded-lg border border-slate-200  text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-100">
                  <Brain className="w-8 h-8"/>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có kết quả phân tích</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
                  Chọn các triệu chứng đang gặp phải ở bảng bên trái và nhấn <b className="text-slate-700">"Phân tích AI"</b>.
                </p>
              </div>
            )}

            {/* Consultation History */}
            {history.length > 0 && (
              <div className="bg-white p-5 rounded-lg border border-slate-200 ">
                <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500"/> Lịch sử tư vấn ({history.length})
                </h3>
                <div className="space-y-2">
                  {history.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setResult(item)}
                      className="p-3 rounded-md bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[13px] text-slate-800 truncate">{item.summary}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {getRiskBadge(item.riskLevel, item.riskScore)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* TAB 2: INTERACTIVE AI DOCTOR CHAT */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-lg  border border-slate-200 flex flex-col h-[500px] sm:h-[600px] overflow-hidden">
          {/* Chat Top Banner */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                <Bot className="w-5 h-5"/>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 truncate">Trợ lý chỉ số</h3>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider shrink-0 border border-blue-200">
                    Gemini 3.7
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Sẵn sàng giải đáp thắc mắc sức khỏe
                </p>
              </div>
            </div>
          </div>

          {/* Quick suggestions pills */}
          <div className="px-3 sm:px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={chatLoading}
                className="whitespace-nowrap px-3 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 text-[11px] transition-colors cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Bot className="w-4 h-4"/>
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 sm:p-4 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-50 text-slate-800 border border-slate-200'
                }`}>
                  <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                  <div className={`text-[10px] font-semibold mt-1 text-right ${msg.role === 'user' ? 'text-slate-500' : 'text-slate-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                    <UserIcon className="w-4 h-4"/>
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Bot className="w-4 h-4"/>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-[13px] font-medium text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0"/>
                  <span>Đang xử lý câu trả lời...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef}/>
          </div>

          {/* Chat input form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Hỏi bác sĩ AI..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              className="flex-1 px-3 py-2.5 text-sm font-medium rounded-md border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
            />
            <Button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="rounded-md px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2"
            >
              <Send className="w-4 h-4"/>
              <span className="hidden sm:inline">Gửi</span>
            </Button>
          </form>
        </motion.div>
      )}
    </motion.div>
  );
};
