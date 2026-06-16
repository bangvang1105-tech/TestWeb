'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import { db } from '@/firebase'; 
import { collection, getDocs, query } from 'firebase/firestore';

// Hàm hỗ trợ xác định Part dựa vào ID câu hỏi (Chuẩn format TOEIC mới)
const getPartByQuestionId = (id) => {
  const numId = parseInt(id);
  if (numId >= 1 && numId <= 6) return 1;
  if (numId >= 7 && numId <= 31) return 2;
  if (numId >= 32 && numId <= 70) return 3;
  if (numId >= 71 && numId <= 100) return 4;
  if (numId >= 101 && numId <= 130) return 5;
  if (numId >= 131 && numId <= 146) return 6;
  if (numId >= 147 && numId <= 200) return 7;
  return 1; // Mặc định
};

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const book = searchParams.get('book');
  const testId = searchParams.get('test');
  const mode = searchParams.get('mode') || 'practice'; // 'full' hoặc 'practice'
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States cho UI/UX
  const [activePart, setActivePart] = useState(1);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeft, setTimeLeft] = useState(7200); // 120 phút = 7200 giây

  // Lấy dữ liệu từ Firebase
  useEffect(() => {
    if (!book || !testId) return;

    async function loadTestData() {
      try {
        const formattedTestId = testId.padStart(2, '0');
        const docId = `${book.toUpperCase()}_${formattedTestId}`; 
        const path = `toeic_tests/${docId}/questions`;
        
        const q = query(collection(db, path));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ép kiểu ID sang số để sắp xếp chuẩn từ câu 1 đến 200
        data.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        setQuestions(data);
      } catch (err) {
        console.error("Lỗi khi load đề:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTestData();
  }, [book, testId]);

  // Logic đếm ngược thời gian
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft]);

  // Format thời gian hiển thị (MM:SS)
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Xử lý chọn đáp án
  const handleSelectOption = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  // Xử lý cắm cờ
  const toggleFlag = (id) => {
    setFlagged(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Xử lý cuộn đến câu hỏi khi click trên Bubble Sheet
  const scrollToQuestion = (id) => {
    const partOfQuestion = getPartByQuestionId(id);
    if (activePart !== partOfQuestion) {
      setActivePart(partOfQuestion);
      // Đợi component render xong tab mới rồi mới cuộn
      setTimeout(() => {
        document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase">Đang nạp dữ liệu phòng thi...</p>
      </div>
    );
  }

  // Lọc câu hỏi theo Part hiện tại
  const currentQuestions = questions.filter(q => getPartByQuestionId(q.id) === activePart);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* 1. TOP HEADER */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-500 font-bold hover:bg-slate-100 px-3 py-1.5 rounded-lg transition">✕ Thoát</button>
          <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
          <div className="hidden sm:block">
            <h1 className="font-black text-sm lg:text-lg text-slate-800 uppercase">{book} - TEST {testId}</h1>
            <p className="text-[10px] text-blue-500 font-bold uppercase">{mode === 'full' ? '🔥 Thi Thật' : '🌱 Luyện Tập'}</p>
          </div>
        </div>
        
        {/* TABS 7 PARTS */}
        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
          {[1,2,3,4,5,6,7].map(part => (
            <button 
              key={part} 
              onClick={() => setActivePart(part)}
              className={`px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-bold rounded-lg transition-all ${activePart === part ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Part {part}
            </button>
          ))}
        </div>

        {/* TIMER & SUBMIT */}
        <div className="flex items-center gap-3 lg:gap-4">
          <div className={`flex items-center gap-2 border px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            <span className="text-lg hidden sm:inline">⏱</span>
            <span className="font-mono font-bold text-lg tracking-wider">{formatTime(timeLeft)}</span>
          </div>
          <button className="bg-blue-600 text-white font-bold text-sm lg:text-base px-4 py-1.5 lg:px-6 lg:py-2 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all">Nộp Bài</button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SPLIT PANE CONTENT (CỘT TRÁI + GIỮA) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
          
          {/* NỬA TRÁI: HIỂN THỊ ĐOẠN VĂN / HÌNH ẢNH / AUDIO */}
          <div className="w-full lg:w-1/2 p-4 lg:p-6 overflow-y-auto border-r border-gray-200 custom-scrollbar bg-slate-50">
             <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100 min-h-full">
                {/* Ở đây sau này bạn sẽ viết logic: Nếu câu hỏi có chứa q.passage_content hoặc q.image_url thì render ra đây */}
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm font-medium border-2 border-dashed border-slate-100 rounded-xl p-10 text-center">
                   <span className="text-4xl mb-3">📄</span>
                   <p>Khu vực hiển thị <br/> Hình ảnh / Đoạn văn / Audio Player</p>
                   <p className="mt-2 text-xs">(Dữ liệu sẽ tự động load dựa vào câu hỏi bên phải)</p>
                </div>
             </div>
          </div>

          {/* NỬA PHẢI: DANH SÁCH CÂU HỎI */}
          <div className="w-full lg:w-1/2 p-4 lg:p-6 overflow-y-auto custom-scrollbar">
             <div className="max-w-2xl mx-auto space-y-6 pb-20">
                
                {/* Header nhỏ cho từng Part */}
                <div className="mb-6">
                  <h2 className="text-xl font-black text-slate-800">Part {activePart}</h2>
                  <p className="text-sm text-slate-500">Hãy chọn đáp án đúng nhất cho các câu hỏi dưới đây.</p>
                </div>

                {currentQuestions.map((q) => (
                  <div key={q.id} id={`question-${q.id}`} className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
                    
                    {/* Nút Cắm cờ */}
                    <button 
                      onClick={() => toggleFlag(q.id)}
                      title="Cắm cờ để xem lại"
                      className={`absolute top-4 right-4 p-2 rounded-full transition-all ${flagged[q.id] ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:bg-gray-50'}`}
                    >
                      🚩
                    </button>

                    <div className="flex gap-3 mb-5 pr-10">
                      <span className="w-8 h-8 shrink-0 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center text-sm shadow-inner">{q.id}</span>
                      <p className="font-semibold text-slate-800 text-base lg:text-lg leading-relaxed mt-0.5">
                        {q.question || `Question ${q.id}`}
                      </p>
                    </div>

                    <div className="pl-11 grid grid-cols-1 gap-2.5">
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const optionText = q[`option${opt}`] || q[`option_${opt.toLowerCase()}`];
                        if (!optionText) return null; // Ẩn nếu không có đáp án (VD: Part 2 chỉ có A,B,C)
                        const isSelected = answers[q.id] === opt;
                        
                        return (
                          <button 
                            key={opt}
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={`flex items-start gap-3 p-3 lg:p-3.5 border-2 rounded-xl transition-all duration-200 text-left ${
                              isSelected 
                              ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold shadow-sm' 
                              : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-black transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              {opt}
                            </span>
                            <span className="leading-relaxed text-sm lg:text-base">{optionText}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

             </div>
          </div>
        </div>

        {/* 3. BẢNG ĐÁP ÁN BÊN PHẢI (BUBBLE SHEET) */}
        <aside className="hidden lg:flex w-72 bg-white border-l border-gray-200 flex-col shrink-0 z-20 shadow-xl">
          <div className="p-5 border-b border-gray-100 bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-lg">Answer Sheet</h3>
            <div className="flex justify-between mt-3 text-xs font-bold text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm"></div> Đã làm: <span className="text-slate-800">{Object.keys(answers).length}</span></span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm"></div> Xem lại: <span className="text-slate-800">{Object.values(flagged).filter(Boolean).length}</span></span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 lg:p-5 custom-scrollbar">
            
            {/* Listening Section */}
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-full h-px bg-blue-100"></span> LISTENING <span className="w-full h-px bg-blue-100"></span></h4>
            <div className="grid grid-cols-5 gap-2 mb-8">
              {[...Array(100)].map((_, i) => {
                const id = i + 1;
                const isAnswered = !!answers[id];
                const isFlagged = flagged[id];
                return (
                  <button 
                    key={id} 
                    onClick={() => scrollToQuestion(id)}
                    className={`aspect-square border rounded-lg flex flex-col items-center justify-center transition-all relative group
                      ${isAnswered ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50'}
                    `}
                  >
                    <span className={`text-xs font-bold ${isAnswered ? 'text-white' : ''}`}>{id}</span>
                    {isAnswered && <span className="text-[9px] font-black leading-none mt-0.5">{answers[id]}</span>}
                    {isFlagged && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>}
                  </button>
                );
              })}
            </div>

            {/* Reading Section */}
            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-full h-px bg-rose-100"></span> READING <span className="w-full h-px bg-rose-100"></span></h4>
            <div className="grid grid-cols-5 gap-2 pb-10">
              {[...Array(100)].map((_, i) => {
                const id = i + 101;
                const isAnswered = !!answers[id];
                const isFlagged = flagged[id];
                return (
                  <button 
                    key={id} 
                    onClick={() => scrollToQuestion(id)}
                    className={`aspect-square border rounded-lg flex flex-col items-center justify-center transition-all relative group
                      ${isAnswered ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'border-slate-200 text-slate-500 hover:border-rose-300 hover:bg-rose-50'}
                    `}
                  >
                    <span className={`text-[11px] font-bold ${isAnswered ? 'text-white' : ''}`}>{id}</span>
                    {isAnswered && <span className="text-[9px] font-black leading-none mt-0.5">{answers[id]}</span>}
                    {isFlagged && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>}
                  </button>
                );
              })}
            </div>

          </div>
        </aside>

      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ExamContent />
    </Suspense>
  );
}