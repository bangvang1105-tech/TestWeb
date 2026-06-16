'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { db } from '@/firebase'; 
import { collection, getDocs, doc, getDoc, query } from 'firebase/firestore';

// Hàm xác định Part dựa vào ID câu hỏi (Chuẩn format TOEIC)
const getPartByQuestionId = (id) => {
  const numId = parseInt(id);
  if (numId >= 1 && numId <= 6) return 1;
  if (numId >= 7 && numId <= 31) return 2;
  if (numId >= 32 && numId <= 70) return 3;
  if (numId >= 71 && numId <= 100) return 4;
  if (numId >= 101 && numId <= 130) return 5;
  if (numId >= 131 && numId <= 146) return 6;
  if (numId >= 147 && numId <= 200) return 7;
  return 1;
};

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const book = searchParams.get('book');
  const testId = searchParams.get('test');
  const mode = searchParams.get('mode') || 'practice'; 
  
  const [testInfo, setTestInfo] = useState(null); // Lưu Audio URL và cấu hình đề
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activePart, setActivePart] = useState(1);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeft, setTimeLeft] = useState(7200); 

  // 1. TẢI DỮ LIỆU TỪ FIREBASE (Gồm cả Info và Questions)
  useEffect(() => {
    if (!book || !testId) return;

    async function loadTestData() {
      try {
        const formattedTestId = testId.padStart(2, '0');
        const docId = `${book.toUpperCase()}_${formattedTestId}`; // VD: ETS2023_01
        
        // Tải Test Info (Chứa link Audio)
        const testRef = doc(db, 'toeic_tests', docId);
        const testSnap = await getDoc(testRef);
        if (testSnap.exists()) {
          setTestInfo(testSnap.data());
        }

        // Tải Questions (Chứa câu hỏi, đoạn văn, đáp án)
        const qRef = collection(db, `toeic_tests/${docId}/questions`);
        const querySnapshot = await getDocs(query(qRef));
        
        const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => parseInt(a.id) - parseInt(b.id)); // Sắp xếp 1 -> 200
        setQuestions(data);
      } catch (err) {
        console.error("Lỗi khi load đề:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTestData();
  }, [book, testId]);

  // Logic đếm ngược
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectOption = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (id) => {
    setFlagged(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToQuestion = (id) => {
    const partOfQuestion = getPartByQuestionId(id);
    if (activePart !== partOfQuestion) {
      setActivePart(partOfQuestion);
      setTimeout(() => {
        document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else {
      document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase">Đang nạp phòng thi chuẩn IIG...</p>
      </div>
    );
  }

  // 2. THUẬT TOÁN GOM NHÓM CÂU HỎI & ĐOẠN VĂN
  const currentQuestions = questions.filter(q => getPartByQuestionId(q.id) === activePart);
  const groupedQuestions = [];
  let currentGroup = null;

  currentQuestions.forEach(q => {
    const gId = q.group_id || `single_${q.id}`;
    
    if (!currentGroup || currentGroup.groupId !== gId) {
      if (currentGroup) groupedQuestions.push(currentGroup);
      currentGroup = {
        groupId: gId,
        passageContent: q.passage_content || '',
        imageUrl: q.image_url || '',
        questions: []
      };
    }
    // Cập nhật đoạn văn nếu nó nằm ở câu thứ 2, thứ 3 của nhóm
    if (!currentGroup.passageContent && q.passage_content) currentGroup.passageContent = q.passage_content;
    if (!currentGroup.imageUrl && q.image_url) currentGroup.imageUrl = q.image_url;
    
    currentGroup.questions.push(q);
  });
  if (currentGroup) groupedQuestions.push(currentGroup);

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-500 font-bold hover:bg-slate-100 px-3 py-1.5 rounded-lg transition">✕ Thoát</button>
          <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
          <div className="hidden sm:block">
            <h1 className="font-black text-sm lg:text-lg text-slate-800 uppercase">{book} - TEST {testId}</h1>
            <p className="text-[10px] text-blue-500 font-bold uppercase">{mode === 'full' ? '🔥 Thi Thật' : '🌱 Luyện Tập'}</p>
          </div>
        </div>
        
        {/* TABS ĐIỀU HƯỚNG */}
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

        <div className="flex items-center gap-3 lg:gap-4">
          <div className={`flex items-center gap-2 border px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            <span className="text-lg hidden sm:inline">⏱</span>
            <span className="font-mono font-bold text-lg tracking-wider">{formatTime(timeLeft)}</span>
          </div>
          <button className="bg-blue-600 text-white font-bold text-sm lg:text-base px-4 py-1.5 lg:px-6 lg:py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all">Nộp Bài</button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CỘT CHÍNH CHỨA ĐỀ */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 lg:p-8">
          <div className="max-w-6xl mx-auto w-full">
            
            {/* TRÌNH PHÁT AUDIO (Chỉ hiện ở Part 1 -> 4) */}
            {activePart <= 4 && testInfo?.full_audio_url && (
              <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 sticky top-0 z-20">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">🎧</span> File Nghe Audio Toàn Bài
                </h3>
                {/* Đã thêm Key và Replace để fix triệt để lỗi link bị ẩn dấu cách/xuống dòng */}
                <audio 
                  key={testInfo.full_audio_url} 
                  controls 
                  className="w-full h-12 outline-none rounded-lg"
                >
                  <source src={testInfo.full_audio_url.replace(/\s+/g, '')} type="audio/mpeg" />
                  Trình duyệt không hỗ trợ Audio.
                </audio>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-800">Part {activePart}</h2>
            </div>

            {/* RENDER CÁC NHÓM CÂU HỎI (SPLIT PANE) */}
            {groupedQuestions.map((group) => {
              const hasContext = group.passageContent || group.imageUrl;

              return (
                <div key={group.groupId} className={`bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden flex flex-col ${hasContext ? 'lg:flex-row' : ''}`}>
                  
                  {/* NỬA TRÁI: ĐOẠN VĂN VÀ HÌNH ẢNH */}
                  {hasContext && (
                    <div className="w-full lg:w-1/2 p-6 lg:p-8 bg-slate-50 border-b lg:border-b-0 lg:border-r border-gray-200">
                      {group.imageUrl && (
                        <img src={group.imageUrl} alt="TOEIC Resource" className="max-w-full rounded-xl mb-6 shadow-sm border border-gray-200 mx-auto" />
                      )}
                      {group.passageContent && (
                        <div className="prose max-w-none text-slate-800 text-sm lg:text-base leading-loose whitespace-pre-wrap">
                          {group.passageContent}
                        </div>
                      )}
                    </div>
                  )}

                  {/* NỬA PHẢI: CÂU HỎI */}
                  <div className={`w-full p-6 lg:p-8 ${hasContext ? 'lg:w-1/2' : ''}`}>
                    {group.questions.map((q, idx) => (
                      <div key={q.id} id={`question-${q.id}`} className={`relative group ${idx !== 0 ? 'mt-8 pt-8 border-t border-dashed border-gray-200' : ''}`}>
                        
                        <button onClick={() => toggleFlag(q.id)} title="Cắm cờ xem lại" className={`absolute top-0 right-0 p-2 rounded-full transition-all ${flagged[q.id] ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:bg-gray-50'}`}>🚩</button>

                        <div className="flex gap-3 mb-5 pr-10">
                          <span className="w-8 h-8 shrink-0 bg-slate-800 text-white font-black rounded-full flex items-center justify-center text-sm shadow-md">{q.id}</span>
                          <p className="font-semibold text-slate-800 text-base lg:text-lg leading-relaxed mt-0.5">
                            {q.question || `Question ${q.id}`}
                          </p>
                        </div>

                        <div className="pl-11 grid grid-cols-1 gap-3">
                          {['A', 'B', 'C', 'D'].map(opt => {
                            // Lấy dữ liệu option (Hỗ trợ cả optionA và option_a từ Excel)
                            const optionText = q[`option${opt}`] || q[`option_${opt.toLowerCase()}`];
                            if (!optionText) return null; 
                            
                            const isSelected = answers[q.id] === opt;
                            
                            return (
                              <button 
                                key={opt}
                                onClick={() => handleSelectOption(q.id, opt)}
                                className={`flex items-start gap-3 p-3.5 border-2 rounded-xl transition-all duration-200 text-left ${
                                  isSelected 
                                  ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm' 
                                  : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-black transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                  {opt}
                                </span>
                                <span className={`leading-relaxed text-sm lg:text-base ${isSelected ? 'font-bold' : 'font-medium'}`}>{optionText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}

          </div>
        </div>

        {/* SIDEBAR BẢNG ĐÁP ÁN (BUBBLE SHEET) */}
        <aside className="hidden lg:flex w-72 bg-white border-l border-gray-200 flex-col shrink-0 z-20 shadow-xl">
          <div className="p-5 border-b border-gray-100 bg-slate-50">
            <h3 className="font-black text-slate-800 text-lg">Bảng Trả Lời</h3>
            <div className="flex justify-between mt-3 text-xs font-bold text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div> Đã làm: <span className="text-slate-800">{Object.keys(answers).length}</span></span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div> Xem lại: <span className="text-slate-800">{Object.values(flagged).filter(Boolean).length}</span></span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {/* Listening */}
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-full h-px bg-blue-100"></span> LISTENING <span className="w-full h-px bg-blue-100"></span></h4>
            <div className="grid grid-cols-5 gap-2 mb-8">
              {[...Array(100)].map((_, i) => {
                const id = i + 1;
                const isAnswered = !!answers[id];
                return (
                  <button 
                    key={id} 
                    onClick={() => scrollToQuestion(id)}
                    className={`aspect-square border rounded-lg flex flex-col items-center justify-center transition-all relative group ${isAnswered ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'border-slate-200 text-slate-500 hover:border-blue-400 hover:bg-blue-50'}`}
                  >
                    <span className={`text-xs font-bold ${isAnswered ? 'text-white' : ''}`}>{id}</span>
                    {isAnswered && <span className="text-[9px] font-black leading-none mt-0.5">{answers[id]}</span>}
                    {flagged[id] && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>}
                  </button>
                );
              })}
            </div>

            {/* Reading */}
            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-full h-px bg-rose-100"></span> READING <span className="w-full h-px bg-rose-100"></span></h4>
            <div className="grid grid-cols-5 gap-2 pb-10">
              {[...Array(100)].map((_, i) => {
                const id = i + 101;
                const isAnswered = !!answers[id];
                return (
                  <button 
                    key={id} 
                    onClick={() => scrollToQuestion(id)}
                    className={`aspect-square border rounded-lg flex flex-col items-center justify-center transition-all relative group ${isAnswered ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'border-slate-200 text-slate-500 hover:border-rose-400 hover:bg-rose-50'}`}
                  >
                    <span className={`text-[11px] font-bold ${isAnswered ? 'text-white' : ''}`}>{id}</span>
                    {isAnswered && <span className="text-[9px] font-black leading-none mt-0.5">{answers[id]}</span>}
                    {flagged[id] && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>}
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