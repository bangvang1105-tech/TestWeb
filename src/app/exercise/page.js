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

  const [userInput, setUserInput] = useState("");
  const [inputQ, setInputQ] = useState("");
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [inputC, setInputC] = useState("");
  const [part3Inputs, setPart3Inputs] = useState([]);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [streak, setStreak] = useState(0);

  const [part6Answers, setPart6Answers] = useState({ 1: '', 2: '', 3: '', 4: '' });
  
  // Tích lũy điểm (Dành cho Part 5, 6, 7 sau này)
  const [totalScore, setTotalScore] = useState(0);

  // ĐỒNG BỘ DỮ LIỆU BAN ĐẦU VÀ LẤY TIẾN TRÌNH CŨ (NẾU CÓ)
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
              const validData = results.data.filter(r => r.id || r.question || r.transcript || r.maskedsentence || r.correctanswer || r.explanation || r.content);
              setData(validData); 
              
              // 🌟 XỬ LÝ HỌC TIẾP (RESUME) TỪ FIREBASE
              let savedIndex = 0;
              let savedScore = 0;
              if (CURRENT_USER_ID && isResume) {
                const progressSnap = await getDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_part_${partKey}`));
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

  // 🌟 TỰ ĐỘNG LƯU TIẾN TRÌNH (ĐANG HỌC) MỖI KHI ĐỔI CÂU
  useEffect(() => {
    async function saveProgress() {
      if (!CURRENT_USER_ID || loading || data.length === 0) return;
      
      // Chỉ lưu trạng thái 'in_progress' nếu đang ở giữa bài (từ câu 2 trở đi và chưa tới câu cuối)
      // (Nếu vừa vào câu 1 đã thoát thì coi như chưa học)
      if (currentIndex > 0 && currentIndex < data.length - 1) {
        try {
          await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_part_${partKey}`), {
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

  // 🌟 LƯU TRẠNG THÁI HOÀN THÀNH KHI KẾT THÚC BÀI
  const handleFinishExercise = async () => {
    if (!CURRENT_USER_ID) {
      alert("🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập!");
      router.back();
      return;
    }
    
    try {
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_part_${partKey}`), {
        status: 'completed',
        currentIndex: 0, // Trả về 0 để nếu ôn lại thì bắt đầu từ đầu
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

  const getPart6Options = (optString) => {
    if (!optString) return [];
    return optString.split('|').map(o => o.trim());
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Đang tải dữ liệu...</div>;
  if (data.length === 0) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500 text-center px-4">Không có dữ liệu!<br/><span className="text-sm font-normal text-gray-500 mt-2 block">Vui lòng kiểm tra lại đường link hoặc cấu hình Firebase.</span></div>;

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

  if (pKey.includes('p6') || normalizedQ.hasOwnProperty('q1_options')) {
    currentPart = 'PART 6';
  } else if (pKey.includes('p5') || normalizedQ.hasOwnProperty('explanation') || normalizedQ.hasOwnProperty('optiond')) {
    currentPart = 'PART 5';
  } else if (pKey.includes('p4') || (normalizedQ.hasOwnProperty('transcript') && pKey.includes('p4'))) {
    currentPart = 'PART 4';
  } else if (pKey.includes('p3') || normalizedQ.hasOwnProperty('transcript')) {
    currentPart = 'PART 3';
  } else if (pKey.includes('p2') || normalizedQ.hasOwnProperty('optiona')) {
    currentPart = 'PART 2';
  }

  const checkMatch = (val, ans) => (val || "").trim().toLowerCase() === (ans || "").trim().toLowerCase();

  const goToQuestion = (index) => {
    setUserInput("");
    setInputQ(""); setInputA(""); setInputB(""); setInputC("");
    setPart3Inputs([]); 
    setSelectedAnswer(null);
    setPart6Answers({ 1: '', 2: '', 3: '', 4: '' });
    setShowResult(false);
    setCurrentIndex(index);
  };

  const handleSelectPart5 = (option) => {
    if (showResult) return; 
    setSelectedAnswer(option);
    setShowResult(true);
    
    const correctAns = (normalizedQ.correctoption || "").trim().toUpperCase();
    if (option === correctAns) {
      setStreak(prev => prev + 1);
      setTotalScore(prev => prev + 1); // Cộng điểm nếu đúng
    } else {
      setStreak(0);
    }
  };

  // Logic nộp bài Part 6 (Kiểm tra 4 ô và tính điểm)
  const handleSubmitPart6 = () => {
    setShowResult(true);
    let correctCount = 0;
    [1, 2, 3, 4].forEach(qNum => {
       const correctLetter = (normalizedQ[`q${qNum}_correct`] || "").trim().toUpperCase();
       if (part6Answers[qNum] === correctLetter) correctCount++;
    });
    setTotalScore(prev => prev + correctCount);
  };

  const handleNext = () => {
    if (currentIndex < data.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      handleFinishExercise();
    }
  };

  const InputRowPart2 = ({ label, value, setValue, answer }) => {
    const isCorrect = showResult && checkMatch(value, answer);
    const isWrong = showResult && !checkMatch(value, answer);

    return (
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className={`font-bold text-lg w-6 ${label === 'Q' ? 'text-blue-600' : 'text-gray-600'}`}>{label}.</span>
          <input
            type="text"
            className={`flex-1 p-3 rounded-xl border-2 outline-none transition-all font-medium text-gray-900 
              ${!showResult ? 'bg-white border-gray-200 focus:border-blue-400' : ''}
              ${isCorrect ? 'bg-green-50 border-green-400 text-green-700' : ''}
              ${isWrong ? 'bg-red-50 border-red-400 text-red-700' : ''}
            `}
            placeholder={`Chép nội dung ${label === 'Q' ? 'câu hỏi' : 'đáp án ' + label}...`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={showResult}
          />
        </div>
        {isWrong && (
          <p className="text-sm text-red-600 mt-1 ml-9">
            Đáp án đúng: <span className="font-bold">{answer}</span>
          </p>
        )}
      </div>
    );
  };

  const renderClozeTest = () => {
    if (!normalizedQ.transcript) return null;
    const parts = normalizedQ.transcript.split(/\[(.*?)\]/);
    const focusColor = currentPart === 'PART 4' ? 'focus:border-orange-500' : 'focus:border-purple-500';
    
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 leading-loose text-gray-800 text-lg">
        {parts.map((part, index) => {
          if (index % 2 === 0) {
            return (
              <span key={index}>
                {part.split('<br>').map((line, i, arr) => (
                  <React.Fragment key={i}>
                    {line}
                    {i !== arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
            );
          } else {
            const blankIndex = Math.floor(index / 2);
            const isCorrect = showResult && checkMatch(part3Inputs[blankIndex], part);
            const isWrong = showResult && !checkMatch(part3Inputs[blankIndex], part);

            return (
              <span key={index} className="inline-flex items-center mx-1 align-middle">
                <input
                  type="text"
                  className={`px-3 py-1 text-center border-b-2 outline-none font-bold text-gray-900 transition-all w-32
                    ${!showResult ? `border-gray-400 bg-transparent ${focusColor}` : ''}
                    ${isCorrect ? 'border-green-500 text-green-700 bg-green-50 rounded' : ''}
                    ${isWrong ? 'border-red-500 text-red-700 bg-red-50 rounded' : ''}
                  `}
                  value={part3Inputs[blankIndex] || ""}
                  onChange={(e) => {
                    const newInputs = [...part3Inputs];
                    newInputs[blankIndex] = e.target.value;
                    setPart3Inputs(newInputs);
                  }}
                  disabled={showResult}
                />
                {isWrong && (
                  <span className="ml-2 text-sm text-red-700 font-bold bg-red-100 px-2 py-1 rounded-md border border-red-200 shadow-sm">
                    {part}
                  </span>
                )}
              </span>
            );
          }
        })}
      </div>
    );
  };

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
        {docType === 'email' && (
          <div className="border-b border-gray-200 pb-4 mb-5 text-sm text-gray-500 font-mono space-y-1">
            <div><span className="font-bold text-gray-700">From:</span> communications@company-network.com</div>
            <div><span className="font-bold text-gray-700">To:</span> system-recipients@global-services.org</div>
            <div className="font-bold text-blue-600">Subject: TOEIC Part 6 Contextual Reading Document</div>
          </div>
        )}
        {docType === 'memo' && (
          <div className="text-center border-b-2 border-purple-200 pb-2 mb-5">
            <h2 className="text-xl font-black tracking-widest text-purple-700">INTERNAL MEMORANDUM</h2>
          </div>
        )}
        {docType === 'notice' && (
          <div className="text-center border-b-2 border-green-200 pb-2 mb-5">
            <h2 className="text-xl font-black tracking-widest text-green-700">OFFICIAL ANNOUNCEMENT</h2>
          </div>
        )}

        <p>
          {parts.map((part, index) => {
            const match = part.match(/^\[(\d+)\]$/);
            if (match) {
              const qNum = match[1]; 
              const optKey = `q${qNum}_options`;
              const correctKey = `q${qNum}_correct`;
              const expKey = `q${qNum}_exp`;
              
              const options = getPart6Options(normalizedQ[optKey]);
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
                    onChange={(e) => {
                      if (showResult) return;
                      setPart6Answers(prev => ({ ...prev, [qNum]: e.target.value }));
                    }}
                    disabled={showResult}
                  >
                    <option value="">👉 Chọn đáp án [{qNum}]</option>
                    {options.map((opt, i) => {
                      const letter = opt.substring(0, 1).toUpperCase();
                      return (
                        <option key={i} value={letter}>
                          {opt}
                        </option>
                      );
                    })}
                  </select>

                  {isWrong && normalizedQ[expKey] && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-red-600 text-white text-xs font-semibold p-3 rounded-xl shadow-xl w-64 text-center leading-normal">
                      <span className="block font-black border-b border-red-400 pb-1 mb-1">
                        CÂU {qNum} ĐÁP ÁN ĐÚNG:<br/>{correctFullText}
                      </span>
                      <span className="block pt-1">{normalizedQ[expKey]}</span>
                    </div>
                  )}
                </span>
              );
            } else {
              return <span key={index}>{part}</span>;
            }
          })}
        </p>
      </div>
    );
  };

  const badgeColors = {
    'PART 1': 'bg-green-500',
    'PART 2': 'bg-blue-500',
    'PART 3': 'bg-purple-500',
    'PART 4': 'bg-orange-500',
    'PART 5': 'bg-red-500',
    'PART 6': 'bg-emerald-600',
  };

  const themeColor = badgeColors[currentPart] || 'bg-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* CỘT TRÁI: BẢNG LƯỚI ĐIỀU HƯỚNG CÂU HỎI */}
        <div className="w-full lg:w-72 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
          <h3 className={`font-bold mb-4 uppercase text-sm text-center text-${themeColor.split('-')[1] || 'blue'}-600`}>
            Bảng câu hỏi
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {data.map((_, i) => (
              <button
                key={i}
                onClick={() => goToQuestion(i)}
                className={`py-2 rounded-lg font-bold text-sm transition-all ${
                  currentIndex === i 
                    ? `${themeColor} text-white shadow-md scale-105` 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* CỘT GIỮA: KHU VỰC HIỂN THỊ BÀI TẬP */}
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <header className="flex justify-between items-center mb-6">
            <button onClick={() => router.back()} className="text-sm text-gray-400 font-bold hover:text-gray-600 transition">← Thoát</button>
            
            <div className="flex items-center gap-4">
              {currentPart === 'PART 5' && streak > 1 && (
                <div className="text-orange-500 font-black animate-pulse flex items-center gap-1">
                  🔥 Combo x{streak}
                </div>
              )}
              <div className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full text-white shadow-sm ${themeColor}`}>
                {currentPart} | CÂU {currentIndex + 1}/{data.length}
              </div>
            </div>
          </header>

          {currentPart !== 'PART 5' && currentPart !== 'PART 6' && (
            <audio key={normalizedQ.audiourl || currentIndex} controls className="w-full h-12 mb-8 shadow-sm rounded-lg bg-gray-50">
              <source src={normalizedQ.audiourl} type="audio/mpeg" />
              Trình duyệt không hỗ trợ Audio.
            </audio>
          )}

          {currentPart === 'PART 1' && (
             <>
               <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-gray-700 font-semibold text-lg">{normalizedQ.maskedsentence}</p>
                  {normalizedQ.hint && normalizedQ.hint !== "undefined" && <p className="text-xs text-green-600 mt-3 font-medium">💡 Gợi ý: {normalizedQ.hint}</p>}
               </div>
               <textarea
                 className="w-full p-4 rounded-2xl bg-white border-2 border-gray-100 mb-6 focus:border-green-400 outline-none transition-all text-sm font-medium text-gray-900 placeholder-gray-400" 
                 rows="3"
                 placeholder="Gõ đáp án vào đây..."
                 value={userInput}
                 onChange={(e) => setUserInput(e.target.value)}
                 disabled={showResult}
               />
               {showResult && (
                 <div className={`mb-6 p-5 rounded-2xl ${userInput.trim().toLowerCase() === (normalizedQ.correctanswer || "").trim().toLowerCase() ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                   <p className="font-bold">{userInput.trim().toLowerCase() === (normalizedQ.correctanswer || "").trim().toLowerCase() ? "Chính xác! 🎉" : "Chưa đúng."}</p>
                   <p className="text-sm mt-1">Đáp án: <span className="font-mono font-bold">{normalizedQ.correctanswer}</span></p>
                 </div>
               )}
             </>
          )}

          {currentPart === 'PART 2' && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6">
              <h3 className="font-bold text-gray-700 mb-4">Nghe và chép lại toàn bộ:</h3>
              <InputRowPart2 label="Q" value={inputQ} setValue={setInputQ} answer={normalizedQ.question} />
              <hr className="my-4 border-gray-200" />
              <InputRowPart2 label="A" value={inputA} setValue={setInputA} answer={normalizedQ.optiona} />
              <InputRowPart2 label="B" value={inputB} setValue={setInputB} answer={normalizedQ.optionb} />
              <InputRowPart2 label="C" value={inputC} setValue={setInputC} answer={normalizedQ.optionc} />
            </div>
          )}

          {(currentPart === 'PART 3' || currentPart === 'PART 4') && renderClozeTest()}

          {currentPart === 'PART 5' && (
            <div className="mb-6">
              <div className="bg-red-50 p-8 rounded-2xl border border-red-100 mb-8 shadow-sm">
                <p className="text-xl font-bold text-gray-900 leading-relaxed text-center">
                  {normalizedQ.question}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const isCorrectAns = (normalizedQ.correctoption || "").trim().toUpperCase() === opt;
                  const isSelected = selectedAnswer === opt;
                  
                  let btnClass = "p-5 border-2 rounded-2xl text-left font-medium transition-all duration-300 text-gray-800 text-lg shadow-sm ";
                  
                  if (!showResult) {
                    btnClass += "bg-white border-gray-200 hover:border-red-400 hover:shadow-md hover:-translate-y-1";
                  } else {
                    if (isCorrectAns) btnClass += "bg-green-100 border-green-500 text-green-800 shadow-md";
                    else if (isSelected) btnClass += "bg-red-100 border-red-500 text-red-800";
                    else btnClass += "bg-gray-50 border-gray-200 opacity-50";
                  }

                  return (
                    <button 
                      key={opt} 
                      onClick={() => handleSelectPart5(opt)} 
                      className={btnClass} 
                      disabled={showResult}
                    >
                      <span className="font-black mr-3 text-gray-400">{opt}.</span> 
                      {normalizedQ[`option${opt.toLowerCase()}`]}
                    </button>
                  );
                })}
              </div>

               {showResult && normalizedQ.explanation && (
                <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-2xl transition-all animate-fadeIn">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                    💡 Giải thích chi tiết
                  </h4>
                  <p className="text-blue-900 leading-relaxed">{normalizedQ.explanation}</p>
                </div>
              )}
            </div>
          )}

          {currentPart === 'PART 6' && (
            <div className="mb-6">
              {renderPart6Document()}
              
              {showResult && normalizedQ.translation && (
                <div className="mt-6 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl transition-all animate-fadeIn shadow-sm">
                  <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-base">
                    🇻🇳 Bản dịch Tiếng Việt toàn văn ngữ cảnh
                  </h4>
                  <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line border-t border-emerald-100 pt-3">
                    {normalizedQ.translation}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 mt-8">
            {currentIndex > 0 && (
              <button 
                onClick={() => goToQuestion(currentIndex - 1)} 
                className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition shadow-sm"
              >
                ← Trở lại
              </button>
            )}

            {!showResult && currentPart !== 'PART 5' ? (
              <button 
                onClick={currentPart === 'PART 6' ? handleSubmitPart6 : () => setShowResult(true)} 
                className={`flex-1 text-white py-4 rounded-xl font-bold transition shadow-lg ${themeColor} hover:opacity-90`}
              >
                {currentPart === 'PART 6' ? 'Nộp báo cáo & Chấm điểm 📋' : 'Kiểm tra đáp án'}
              </button>
            ) : showResult ? (
              <button 
                onClick={handleNext} 
                className={`flex-1 py-4 rounded-xl font-bold transition shadow-lg text-white
                  ${currentPart === 'PART 5' ? 'bg-red-500 hover:bg-red-600' : currentPart === 'PART 6' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-black'}
                `}
              >
                {currentIndex < data.length - 1 ? "Câu tiếp theo →" : "Hoàn thành bài tập"}
              </button>
            ) : (
              <div className="flex-1"></div>
            )}
          </div>
        </div>

        {/* CỘT PHỤ BÊN PHẢI: BẢNG TỪ VỰNG */}
        {showResult && vocabList.length > 0 && (
          <div className="w-full lg:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit transition-all">
            <h3 className={`font-bold mb-4 uppercase text-sm text-center text-${themeColor.split('-')[1] || 'emerald'}-600`}>
              Danh sách từ vựng
            </h3>
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