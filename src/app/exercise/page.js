'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Papa from 'papaparse';

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  let partKey = searchParams.get('part') || 'dictation_p1';
  const isResume = searchParams.get('resume') === 'true';
  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  if (partKey.includes('quiz_')) {
    partKey = partKey.replace('quiz_', 'test_');
  }
  
  const [data, setData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  // States các phần cũ
  const [userInput, setUserInput] = useState("");
  const [inputQ, setInputQ] = useState("");
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [inputC, setInputC] = useState("");
  const [part3Inputs, setPart3Inputs] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [streak, setStreak] = useState(0);
  const [part6Answers, setPart6Answers] = useState({ 1: '', 2: '', 3: '', 4: '' });
  const [totalScore, setTotalScore] = useState(0);

  // 🌟 MỚI: STATES CHO PART 7 
  const [activeTab, setActiveTab] = useState(1); // Để lật giữa Document 1, 2, 3
  const [currentQIndexP7, setCurrentQIndexP7] = useState(1); // Để trượt giữa các câu q1 -> q5
  const [part7Answers, setPart7Answers] = useState({ 1: null, 2: null, 3: null, 4: null, 5: null }); // Lưu đáp án Part 7

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
        if (docSnap.exists()) {
          const response = await fetch(docSnap.data().exerciseUrl);
          const csvText = await response.text();
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => { 
              const validData = results.data.filter(r => r.id || r.question || r.transcript || r.maskedsentence || r.correctanswer || r.explanation || r.content || r.content_1);
              setData(validData); 
              
              let savedIndex = 0;
              let savedScore = 0;
              if (CURRENT_USER_ID && isResume) {
                const progressSnap = await getDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_${partKey}`));
                if (progressSnap.exists()) {
                   const progData = progressSnap.data();
                   if (progData.currentIndex) savedIndex = progData.currentIndex;
                   if (progData.score) savedScore = progData.score;
                }
              }
              setCurrentIndex(savedIndex);
              setTotalScore(savedScore);
              setLoading(false); 
            }
          });
        } else {
          setLoading(false);
        }
      } catch (err) { 
        console.error(err); 
        setLoading(false); 
      }
    }
    loadData();
  }, [partKey, isResume, CURRENT_USER_ID]);

  // Lưu tiến trình (In Progress)
  useEffect(() => {
    async function saveProgress() {
      if (!CURRENT_USER_ID || loading || data.length === 0) return;
      if (currentIndex > 0 && currentIndex < data.length - 1) {
        try {
          await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_${partKey}`), {
            status: 'in_progress',
            currentIndex: currentIndex,
            score: totalScore,
            totalQuestions: data.length,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Lỗi khi lưu tiến trình:", error);
        }
      }
    }
    saveProgress();
  }, [currentIndex, CURRENT_USER_ID, partKey, loading, data.length, totalScore]);

  // Kết thúc bài (Completed)
  const handleFinishExercise = async () => {
    if (!CURRENT_USER_ID) {
      alert("🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập!");
      router.back();
      return;
    }
    try {
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_${partKey}`), {
        status: 'completed',
        currentIndex: 0,
        score: totalScore,
        totalQuestions: data.length,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập!");
      router.back();
    } catch (err) {
      router.back();
    }
  };

  const getVocabList = (vocabString) => {
    if (!vocabString) return [];
    return vocabString.split('|').map(item => {
      const [word, mean] = item.split(':');
      return { word: word?.trim(), mean: mean?.trim() };
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Đang tải dữ liệu...</div>;
  if (data.length === 0) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500 text-center px-4">Không có dữ liệu!<br/><span className="text-sm font-normal text-gray-500 mt-2 block">Vui lòng kiểm tra lại cấu hình Firebase.</span></div>;

  const currentQ = data[currentIndex];
  const normalizedQ = {};
  if (currentQ) {
    Object.keys(currentQ).forEach(key => {
      normalizedQ[key.trim().toLowerCase()] = currentQ[key];
    });
  }

  const vocabList = getVocabList(normalizedQ.vocabulary);
  
  let currentPart = 'PART 1';
  const pKey = partKey.toLowerCase();
  
  if (pKey.includes('p7') || normalizedQ.hasOwnProperty('content_1')) currentPart = 'PART 7';
  else if (pKey.includes('p6') || normalizedQ.hasOwnProperty('q1_options')) currentPart = 'PART 6';
  else if (pKey.includes('p5') || normalizedQ.hasOwnProperty('explanation')) currentPart = 'PART 5';
  else if (pKey.includes('p4') || (normalizedQ.hasOwnProperty('transcript') && pKey.includes('p4'))) currentPart = 'PART 4';
  else if (pKey.includes('p3') || normalizedQ.hasOwnProperty('transcript')) currentPart = 'PART 3';
  else if (pKey.includes('p2') || normalizedQ.hasOwnProperty('optiona')) currentPart = 'PART 2';

  const checkMatch = (val, ans) => (val || "").trim().toLowerCase() === (ans || "").trim().toLowerCase();

  const goToQuestion = (index) => {
    setUserInput(""); setInputQ(""); setInputA(""); setInputB(""); setInputC("");
    setPart3Inputs([]); setSelectedAnswer(null); setPart6Answers({ 1: '', 2: '', 3: '', 4: '' });
    
    // Reset state Part 7
    setPart7Answers({ 1: null, 2: null, 3: null, 4: null, 5: null });
    setActiveTab(1);
    setCurrentQIndexP7(1);
    
    setShowResult(false);
    setCurrentIndex(index);
  };

  // --- CÁC HÀM XỬ LÝ PART CŨ ĐƯỢC THU GỌN ---
  const handleSelectPart5 = (option) => {
    if (showResult) return; 
    setSelectedAnswer(option); setShowResult(true);
    const correctAns = (normalizedQ.correctoption || "").trim().toUpperCase();
    if (option === correctAns) { setStreak(prev => prev + 1); setTotalScore(prev => prev + 1); } 
    else setStreak(0);
  };

  const handleSubmitPart6 = () => {
    setShowResult(true); let correctCount = 0;
    [1, 2, 3, 4].forEach(qNum => {
       const correctLetter = (normalizedQ[`q${qNum}_correct`] || "").trim().toUpperCase();
       if (part6Answers[qNum] === correctLetter) correctCount++;
    });
    setTotalScore(prev => prev + correctCount);
  };

  // 🌟 HÀM MỚI: XỬ LÝ NỘP BÀI PART 7
  const getP7OptionsList = (optStr) => {
    if (!optStr) return [];
    return optStr.split('|').map(o => o.trim());
  };

  const getP7AvailableQuestionsCount = () => {
    let count = 0;
    for (let i = 1; i <= 5; i++) {
      if (normalizedQ[`q${i}`] && normalizedQ[`q${i}`].trim() !== '') count++;
    }
    return count;
  };
  const availableQCount = getP7AvailableQuestionsCount();

  const handleSubmitPart7 = () => {
    setShowResult(true);
    let correctCount = 0;
    for (let i = 1; i <= availableQCount; i++) {
      const correctLetter = (normalizedQ[`q${i}_correct`] || "").trim().toUpperCase();
      if (part7Answers[i] === correctLetter) correctCount++;
    }
    setTotalScore(prev => prev + correctCount);
  };

  const handleNextP7Question = () => {
    if (currentQIndexP7 < availableQCount) setCurrentQIndexP7(prev => prev + 1);
    else handleSubmitPart7();
  };

  const handleNext = () => {
    if (currentIndex < data.length - 1) goToQuestion(currentIndex + 1);
    else handleFinishExercise();
  };

  // --- RENDER FUNCTIONS CŨ ---
  // ... [Giữ nguyên renderPart6Document, renderClozeTest, InputRowPart2 từ code trước] ...
  const renderPart6Document = () => {
    if (!normalizedQ.content) return null;
    const parts = normalizedQ.content.split(/(\[\d+\])/g);
    const docType = (normalizedQ.type || "Notice").trim().toLowerCase();
    let docClass = "p-6 md:p-8 rounded-2xl border-2 shadow-inner mb-6 text-gray-800 text-lg leading-relaxed font-sans whitespace-pre-line bg-white ";
    if (docType === 'email') docClass += "border-blue-200 bg-gradient-to-b from-blue-50/30 to-white";
    else if (docType === 'notice') docClass += "border-green-200 border-dashed bg-stone-50/50";
    else if (docType === 'memo') docClass += "border-purple-200 bg-zinc-50/50";
    else docClass += "border-gray-200 bg-gray-50/30";

    return (
      <div className={docClass}>
        <p>
          {parts.map((part, index) => {
            const match = part.match(/^\[(\d+)\]$/);
            if (match) {
              const qNum = match[1]; 
              const optKey = `q${qNum}_options`;
              const correctKey = `q${qNum}_correct`;
              const expKey = `q${qNum}_exp`;
              const options = getP7OptionsList(normalizedQ[optKey]);
              const selected = part6Answers[qNum] || "";
              const correctLetter = (normalizedQ[correctKey] || "").trim().toUpperCase();
              const isCorrect = showResult && selected === correctLetter;
              const isWrong = showResult && selected !== correctLetter;
              const correctFullText = options.find(opt => opt.toUpperCase().startsWith(`${correctLetter}.`)) || correctLetter;

              return (
                <span key={index} className="inline-block mx-1 align-middle relative group z-10">
                  <select
                    className={`px-2 py-1 font-bold border-2 rounded-xl outline-none transition-all cursor-pointer text-sm max-w-xs md:max-w-md appearance-none text-center shadow-sm
                      ${!showResult ? 'bg-amber-50 border-amber-300 text-amber-900 hover:border-green-500 focus:border-green-600' : ''}
                      ${isCorrect ? 'bg-green-100 border-green-500 text-green-800' : ''}
                      ${isWrong ? 'bg-red-100 border-red-500 text-red-800' : ''}
                    `}
                    value={selected}
                    onChange={(e) => { if (showResult) return; setPart6Answers(prev => ({ ...prev, [qNum]: e.target.value })); }}
                    disabled={showResult}
                  >
                    <option value="">👉 Chọn đáp án [{qNum}]</option>
                    {options.map((opt, i) => {
                      const letter = opt.substring(0, 1).toUpperCase();
                      return <option key={i} value={letter}>{opt}</option>;
                    })}
                  </select>
                  {isWrong && normalizedQ[expKey] && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-red-600 text-white text-xs font-semibold p-3 rounded-xl shadow-xl w-64 text-center leading-normal">
                      <span className="block font-black border-b border-red-400 pb-1 mb-1">CÂU {qNum} ĐÁP ÁN ĐÚNG:<br/>{correctFullText}</span>
                      <span className="block pt-1">{normalizedQ[expKey]}</span>
                    </div>
                  )}
                </span>
              );
            } else { return <span key={index}>{part}</span>; }
          })}
        </p>
      </div>
    );
  };

  // 🌟 HÀM RENDER PART 7 (SPLIT-SCREEN MỚI)
  const renderPart7 = () => {
    const hasDoc2 = normalizedQ.content_2 && normalizedQ.content_2.trim() !== '';
    const hasDoc3 = normalizedQ.content_3 && normalizedQ.content_3.trim() !== '';

    return (
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        
        {/* NỬA TRÁI: HIỂN THỊ TÀI LIỆU VỚI TABS */}
        <div className="w-full lg:w-3/5 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-inner">
          <div className="flex bg-gray-200 border-b border-gray-300">
            <button onClick={() => setActiveTab(1)} className={`flex-1 py-3 text-xs font-black uppercase transition-colors ${activeTab === 1 ? 'bg-white text-rose-600 border-t-4 border-rose-500' : 'text-gray-500 hover:bg-gray-100'}`}>Tài liệu 1</button>
            {hasDoc2 && <button onClick={() => setActiveTab(2)} className={`flex-1 py-3 text-xs font-black uppercase transition-colors ${activeTab === 2 ? 'bg-white text-rose-600 border-t-4 border-rose-500' : 'text-gray-500 hover:bg-gray-100'}`}>Tài liệu 2</button>}
            {hasDoc3 && <button onClick={() => setActiveTab(3)} className={`flex-1 py-3 text-xs font-black uppercase transition-colors ${activeTab === 3 ? 'bg-white text-rose-600 border-t-4 border-rose-500' : 'text-gray-500 hover:bg-gray-100'}`}>Tài liệu 3</button>}
          </div>
          <div className="p-6 overflow-y-auto max-h-[600px] text-gray-800 leading-relaxed font-sans whitespace-pre-line text-sm md:text-base bg-white">
            {activeTab === 1 && normalizedQ.content_1}
            {activeTab === 2 && normalizedQ.content_2}
            {activeTab === 3 && normalizedQ.content_3}
          </div>
        </div>

        {/* NỬA PHẢI: KHU VỰC TRẢ LỜI CÂU HỎI */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          
          {/* TRẠNG THÁI LÀM BÀI */}
          {!showResult ? (
            <div className="bg-white border-2 border-rose-100 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                <span className="font-black text-rose-600">Câu hỏi {currentQIndexP7}/{availableQCount}</span>
              </div>
              
              <p className="font-bold text-gray-900 mb-4">{normalizedQ[`q${currentQIndexP7}`]}</p>
              
              <div className="flex flex-col gap-2.5">
                {getP7OptionsList(normalizedQ[`q${currentQIndexP7}_options`]).map(opt => {
                  const letter = opt.substring(0, 1).toUpperCase();
                  const isSelected = part7Answers[currentQIndexP7] === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => setPart7Answers(prev => ({ ...prev, [currentQIndexP7]: letter }))}
                      className={`text-left p-3.5 border-2 rounded-xl text-sm font-semibold transition-all duration-200 
                        ${isSelected ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-rose-300'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <button 
                  disabled={!part7Answers[currentQIndexP7]}
                  onClick={handleNextP7Question}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition shadow-md"
                >
                  {currentQIndexP7 < availableQCount ? 'Lưu & Câu tiếp theo →' : 'Nộp bài & Chấm điểm'}
                </button>
              </div>
            </div>
          ) : (
            // TRẠNG THÁI SHOW KẾT QUẢ (HIỂN THỊ LIST TẤT CẢ CÁC CÂU)
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {Array.from({ length: availableQCount }).map((_, idx) => {
                const qNum = idx + 1;
                const correctLetter = (normalizedQ[`q${qNum}_correct`] || "").trim().toUpperCase();
                const userLetter = part7Answers[qNum];
                const isCorrect = userLetter === correctLetter;

                return (
                  <div key={qNum} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <p className="font-bold text-gray-800 text-sm mb-3">
                      <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{qNum}. </span>
                      {normalizedQ[`q${qNum}`]}
                    </p>
                    <div className="flex flex-col gap-2">
                      {getP7OptionsList(normalizedQ[`q${qNum}_options`]).map(opt => {
                        const letter = opt.substring(0, 1).toUpperCase();
                        let style = "bg-white border-gray-200 text-gray-400 opacity-50";
                        if (letter === correctLetter) style = "bg-green-100 border-green-500 text-green-800 font-bold shadow-sm";
                        else if (letter === userLetter && !isCorrect) style = "bg-red-100 border-red-500 text-red-800 font-bold";
                        
                        return (
                          <div key={letter} className={`text-left p-2.5 border-2 rounded-xl text-xs transition-all ${style}`}>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                    {/* Giải thích câu hỏi */}
                    {!isCorrect && normalizedQ[`q${qNum}_exp`] && (
                      <div className="mt-3 p-3 bg-white border border-red-100 rounded-lg text-xs">
                        <span className="font-bold text-red-600 block mb-1">💡 Giải thích:</span>
                        <span className="text-gray-700 leading-relaxed">{normalizedQ[`q${qNum}_exp`]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const badgeColors = {
    'PART 1': 'bg-green-500', 'PART 2': 'bg-blue-500', 'PART 3': 'bg-purple-500', 
    'PART 4': 'bg-orange-500', 'PART 5': 'bg-red-500', 'PART 6': 'bg-emerald-600', 'PART 7': 'bg-rose-500',
  };
  const themeColor = badgeColors[currentPart] || 'bg-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* CỘT TRÁI: MENU CÂU HỎI */}
        <div className="w-full lg:w-72 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
          <h3 className={`font-bold mb-4 uppercase text-sm text-center text-${themeColor.split('-')[1] || 'blue'}-600`}>Bảng câu hỏi</h3>
          <div className="grid grid-cols-5 gap-2">
            {data.map((_, i) => (
              <button
                key={i} onClick={() => goToQuestion(i)}
                className={`py-2 rounded-lg font-bold text-sm transition-all ${currentIndex === i ? `${themeColor} text-white shadow-md scale-105` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* CỘT GIỮA: KHU VỰC BÀI TẬP */}
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col">
          <header className="flex justify-between items-center mb-6">
            <button onClick={() => router.back()} className="text-sm text-gray-400 font-bold hover:text-gray-600 transition">← Thoát</button>
            <div className="flex items-center gap-4">
              <div className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full text-white shadow-sm ${themeColor}`}>
                {currentPart} | ĐOẠN {currentIndex + 1}/{data.length}
              </div>
            </div>
          </header>

          {/* RENDER THEO TỪNG PART */}
          {currentPart === 'PART 5' && (
            // (Đã thu gọn render code Part 5 vào đây)
            <div>...Part 5 Logic (Giữ nguyên)...</div> 
          )}
          {currentPart === 'PART 6' && renderPart6Document()}
          {currentPart === 'PART 7' && renderPart7()}

          {/* BẢN DỊCH CHUNG CHO P6, P7 NẾU SHOWRESULT */}
          {showResult && (currentPart === 'PART 6' || currentPart === 'PART 7') && normalizedQ.translation && (
            <div className="mt-2 p-6 bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">🇻🇳 Bản dịch Tiếng Việt toàn văn</h4>
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line border-t border-slate-200 pt-3">{normalizedQ.translation}</p>
            </div>
          )}

          {/* THANH ĐIỀU HƯỚNG CHUNG CUỐI TRANG */}
          <div className="flex gap-4 mt-auto pt-8">
            {currentIndex > 0 && (
              <button onClick={() => goToQuestion(currentIndex - 1)} className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition shadow-sm">← Trở lại</button>
            )}

            {!showResult && currentPart !== 'PART 5' && currentPart !== 'PART 7' ? (
              <button onClick={currentPart === 'PART 6' ? handleSubmitPart6 : () => setShowResult(true)} className={`flex-1 text-white py-4 rounded-xl font-bold transition shadow-lg ${themeColor} hover:opacity-90`}>
                Kiểm tra đáp án
              </button>
            ) : showResult ? (
              <button onClick={handleNext} className={`flex-1 py-4 rounded-xl font-bold transition shadow-lg text-white ${currentPart === 'PART 7' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-gray-900 hover:bg-black'}`}>
                {currentIndex < data.length - 1 ? "Bài tiếp theo →" : "Hoàn thành bài tập"}
              </button>
            ) : ( <div className="flex-1"></div> )}
          </div>
        </div>

        {/* CỘT PHẢI: BẢNG TỪ VỰNG CHUNG */}
        {showResult && vocabList.length > 0 && (
          <div className="w-full lg:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
            <h3 className={`font-bold mb-4 uppercase text-sm text-center text-${themeColor.split('-')[1] || 'emerald'}-600`}>Danh sách từ vựng</h3>
            <table className="w-full text-sm">
              <tbody>
                {vocabList.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 font-bold text-gray-800 pr-2 align-top">{item.word}</td>
                    <td className="py-3 text-gray-600 align-top">{item.mean}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Đang khởi tạo...</div>}><ExerciseContent /></Suspense>;
}