'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse';

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';
  
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

  // STATE: Part 5
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [streak, setStreak] = useState(0);

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
            complete: (results) => { 
              const validData = results.data.filter(r => r.id || r.question || r.transcript || r.maskedsentence || r.correctanswer || r.explanation);
              setData(validData); 
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
  }, [partKey]);

  const getVocabList = (vocabString) => {
    if (!vocabString) return [];
    return vocabString.split('|').map(item => {
      const [word, mean] = item.split(':');
      return { word: word?.trim(), mean: mean?.trim() };
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Đang tải dữ liệu...</div>;
  if (data.length === 0) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500 text-center px-4">Không có dữ liệu!<br/><span className="text-sm font-normal text-gray-500 mt-2 block">Vui lòng kiểm tra lại link bài tập.</span></div>;

  const currentQ = data[currentIndex];
  
  // CHUẨN HÓA DỮ LIỆU
  const normalizedQ = {};
  if (currentQ) {
    Object.keys(currentQ).forEach(key => {
      normalizedQ[key.trim().toLowerCase()] = currentQ[key];
    });
  }

  const vocabList = getVocabList(normalizedQ.vocabulary);
  
  // LOGIC ĐỘC QUYỀN: Đảm bảo chỉ 1 Part được nhận diện
  let currentPart = 'PART 1';
  const pKey = partKey.toLowerCase();

  if (pKey.includes('p5') || normalizedQ.hasOwnProperty('explanation') || normalizedQ.hasOwnProperty('optiond')) {
    currentPart = 'PART 5';
  } else if (pKey.includes('p4') || (normalizedQ.hasOwnProperty('transcript') && pKey.includes('p4'))) {
    currentPart = 'PART 4';
  } else if (pKey.includes('p3') || normalizedQ.hasOwnProperty('transcript')) {
    currentPart = 'PART 3';
  } else if (pKey.includes('p2') || normalizedQ.hasOwnProperty('optiona')) {
    currentPart = 'PART 2';
  }

  const checkMatch = (val, ans) => (val || "").trim().toLowerCase() === (ans || "").trim().toLowerCase();

  const handleNext = () => {
    setUserInput("");
    setInputQ(""); setInputA(""); setInputB(""); setInputC("");
    setPart3Inputs([]); 
    setSelectedAnswer(null);
    setShowResult(false);
    
    if (currentIndex < data.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert("🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập!");
    }
  };

  const handleSelectPart5 = (option) => {
    if (showResult) return; 
    setSelectedAnswer(option);
    setShowResult(true);
    
    const correctAns = (normalizedQ.correctoption || "").trim().toUpperCase();
    if (option === correctAns) {
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
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
                  <span className="ml-2 text-sm text-red-700 font-bold bg-red-100 px-2 py-1 rounded-md border border-red-200">
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

  // Lấy màu sắc theo Part hiện tại
  const badgeColors = {
    'PART 1': 'bg-green-500',
    'PART 2': 'bg-blue-500',
    'PART 3': 'bg-purple-500',
    'PART 4': 'bg-orange-500',
    'PART 5': 'bg-red-500',
  };

  const themeColor = badgeColors[currentPart] || 'bg-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* CỘT CHÍNH: KHU VỰC HIỂN THỊ BÀI TẬP */}
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

          {/* TRÌNH PHÁT NHẠC (Bị ẩn khi ở Part 5) */}
          {currentPart !== 'PART 5' && (
            <audio key={normalizedQ.audiourl || currentIndex} controls className="w-full h-12 mb-8 shadow-sm rounded-lg bg-gray-50">
              <source src={normalizedQ.audiourl} type="audio/mpeg" />
              Trình duyệt không hỗ trợ Audio.
            </audio>
          )}

          {/* 1. GIAO DIỆN PART 1 */}
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

          {/* 2. GIAO DIỆN PART 2 */}
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

          {/* 3. GIAO DIỆN PART 3 & PART 4 */}
          {(currentPart === 'PART 3' || currentPart === 'PART 4') && renderClozeTest()}

          {/* 4. GIAO DIỆN MINI-GAME PART 5 */}
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

          {/* THANH ĐIỀU HƯỚNG NÚT BẤM (Chỉ hiện cho Part 1-4 hoặc nút Next chung) */}
          {!showResult && currentPart !== 'PART 5' ? (
            <button 
              onClick={() => setShowResult(true)} 
              className={`w-full text-white py-4 rounded-xl font-bold transition shadow-lg ${themeColor} hover:opacity-90`}
            >
              Kiểm tra đáp án
            </button>
          ) : showResult ? (
            <button 
              onClick={handleNext} 
              className={`w-full py-4 rounded-xl font-bold transition shadow-lg mt-4 text-white
                ${currentPart === 'PART 5' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-black'}
              `}
            >
              {currentIndex < data.length - 1 ? "Câu tiếp theo →" : "Hoàn thành bài tập"}
            </button>
          ) : null}
        </div>

        {/* CỘT PHỤ: BẢNG TỪ VỰNG DÙNG CHUNG */}
        {showResult && vocabList.length > 0 && (
          <div className="w-full md:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit transition-all">
            <h3 className={`font-bold mb-4 uppercase text-sm text-center text-${themeColor.split('-')[1]}-600`}>
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