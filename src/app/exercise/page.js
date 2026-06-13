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
  const [totalScore, setTotalScore] = useState(0);

  const [activeTab, setActiveTab] = useState(1); 
  const [currentQIndexP7, setCurrentQIndexP7] = useState(1); 
  const [part7Answers, setPart7Answers] = useState({ 1: null, 2: null, 3: null, 4: null, 5: null }); 

  const [timeLeft, setTimeLeft] = useState(60); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [survivalGameOver, setSurvivalGameOver] = useState(false);
  const [survivalGameWon, setSurvivalGameWon] = useState(false);
  const [flashState, setFlashState] = useState(null); 

  // 🌟 ĐÃ FIX LỖI LINK GOOGLE SHEETS DẠNG PUBLISH (/d/e/)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
        if (docSnap.exists()) {
          const rawUrl = docSnap.data().exerciseUrl;
          if (!rawUrl) throw new Error("Chưa có link dữ liệu");

          let exportCsvUrl = rawUrl;
          if (rawUrl.includes('/pubhtml')) {
            exportCsvUrl = rawUrl.replace('/pubhtml', '/pub?output=csv');
          } else if (rawUrl.includes('/edit')) {
            exportCsvUrl = rawUrl.split('/edit')[0] + '/export?format=csv';
          } else if (rawUrl.includes('/d/') && !rawUrl.includes('/export') && !rawUrl.includes('/pub')) {
            // Regex loại trừ chữ 'e' để không nhận nhầm link Publish
            const match = rawUrl.match(/\/d\/(?!e\/)([a-zA-Z0-9-_]+)/);
            if (match && match[1]) {
              exportCsvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
            }
          }

          const response = await fetch(exportCsvUrl);
          const csvText = await response.text();
          
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => { 
              const normalizedData = results.data.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                  newRow[key.trim().toLowerCase()] = row[key];
                });
                return newRow;
              });

              const validData = normalizedData.filter(r => r.id || r.question || r.transcript || r.maskedsentence || r.content || r.content_1);
              
              if (validData.length > 0) {
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
              }
              setLoading(false); 
            },
            error: () => {
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

  useEffect(() => {
    if (!isTimerRunning || survivalGameOver || survivalGameWon) return;
    
    if (timeLeft <= 0) {
      setIsTimerRunning(false);
      setSurvivalGameOver(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isTimerRunning, survivalGameOver, survivalGameWon]);

  const handleFinishExercise = async (finalScore = null) => {
    const scoreToSave = finalScore !== null ? finalScore : totalScore;
    if (!CURRENT_USER_ID) {
      alert("🎉 Bạn đã hoàn thành bài tập!");
      router.back();
      return;
    }
    try {
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_${partKey}`), {
        status: 'completed',
        currentIndex: 0,
        score: scoreToSave,
        totalQuestions: data.length,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("🎉 Bạn đã hoàn thành xuất sắc bài tập!");
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
  if (data.length === 0) return <div className="min-h-screen flex flex-col items-center justify-center font-bold text-red-500 text-center px-4 gap-4">
      <div>Không có dữ liệu bài tập!</div>
      <button onClick={() => router.back()} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Quay lại</button>
  </div>;

  const currentQ = data[currentIndex] || {};
  const normalizedQ = currentQ;
  const vocabList = getVocabList(normalizedQ.vocabulary);
  
  let currentPart = 'PART 1';
  const pKey = partKey.toLowerCase();
  
  if (pKey.includes('grammar')) currentPart = 'GRAMMAR_SURVIVAL';
  else if (pKey.includes('p7')) currentPart = 'PART 7';
  else if (pKey.includes('p6')) currentPart = 'PART 6';
  else if (pKey.includes('p5')) currentPart = 'PART 5';
  else if (pKey.includes('p4')) currentPart = 'PART 4';
  else if (pKey.includes('p3')) currentPart = 'PART 3';
  else if (pKey.includes('p2')) currentPart = 'PART 2';

  const checkMatch = (val, ans) => (val || "").trim().toLowerCase() === (ans || "").trim().toLowerCase();

  const goToQuestion = (index) => {
    setUserInput(""); setInputQ(""); setInputA(""); setInputB(""); setInputC("");
    setPart3Inputs([]); setSelectedAnswer(null); setPart6Answers({ 1: '', 2: '', 3: '', 4: '' });
    setPart7Answers({ 1: null, 2: null, 3: null, 4: null, 5: null });
    setActiveTab(1); setCurrentQIndexP7(1); setShowResult(false); setCurrentIndex(index);
  };

  const handleSelectPart5 = (option) => {
    if (showResult) return; 
    setSelectedAnswer(option); setShowResult(true);
    const correctAns = (normalizedQ.correctoption || "").trim().toUpperCase();
    if (option === correctAns) { setStreak(prev => prev + 1); setTotalScore(prev => prev + 1); } 
    else setStreak(0);
  };

  const handleSelectSurvival = (option) => {
    if (survivalGameOver || survivalGameWon || flashState) return;
    const correctAns = (normalizedQ.correctoption || "").trim().toUpperCase();
    if (option === correctAns) {
      setFlashState('correct'); setTimeLeft(prev => prev + 3); setTotalScore(prev => prev + 1);
    } else {
      setFlashState('wrong'); setTimeLeft(prev => prev - 5); 
    }
    setTimeout(() => {
      setFlashState(null);
      if (currentIndex < data.length - 1) { setCurrentIndex(prev => prev + 1); } 
      else { setIsTimerRunning(false); setSurvivalGameWon(true); }
    }, 500);
  };

  const startSurvivalGame = () => {
    setTimeLeft(60); setCurrentIndex(0); setTotalScore(0);
    setSurvivalGameOver(false); setSurvivalGameWon(false); setIsTimerRunning(true);
  };

  const handleSubmitPart6 = () => {
    setShowResult(true); let correctCount = 0;
    [1, 2, 3, 4].forEach(qNum => {
       const correctLetter = (normalizedQ[`q${qNum}_correct`] || "").trim().toUpperCase();
       if (part6Answers[qNum] === correctLetter) correctCount++;
    });
    setTotalScore(prev => prev + correctCount);
  };

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
    setShowResult(true); let correctCount = 0;
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

  const renderPart2InputRow = (label, value, setValue, answer) => {
    const isCorrect = showResult && checkMatch(value, answer);
    const isWrong = showResult && !checkMatch(value, answer);
    return (
      <div className="mb-4" key={label}>
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
            value={value} onChange={(e) => setValue(e.target.value)} disabled={showResult}
          />
        </div>
        {isWrong && ( <p className="text-sm text-red-600 mt-1 ml-9">Đáp án đúng: <span className="font-bold">{answer}</span></p> )}
      </div>
    );
  };

  const renderClozeTest = () => {
    if (!normalizedQ.transcript) return <div className="text-gray-400 p-4 text-center border-2 border-dashed border-gray-200 rounded-xl">Không tìm thấy Transcript.</div>;
    const parts = normalizedQ.transcript.split(/\[(.*?)\]/);
    const focusColor = currentPart === 'PART 4' ? 'focus:border-orange-500' : 'focus:border-purple-500';
    return (
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 leading-loose text-gray-800 text-lg">
        {parts.map((part, index) => {
          if (index % 2 === 0) {
            return (
              <span key={index}>
                {part.split('<br>').map((line, i, arr) => (
                  <React.Fragment key={i}>{line}{i !== arr.length - 1 && <br />}</React.Fragment>
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
                    const newInputs = [...part3Inputs]; newInputs[blankIndex] = e.target.value; setPart3Inputs(newInputs);
                  }}
                  disabled={showResult}
                />
                {isWrong && ( <span className="ml-2 text-sm text-red-700 font-bold bg-red-100 px-2 py-1 rounded-md border border-red-200 shadow-sm">{part}</span> )}
              </span>
            );
          }
        })}
      </div>
    );
  };

  const renderPart6Document = () => {
    if (!normalizedQ.content) return <div className="text-gray-400 p-4 text-center border-2 border-dashed border-gray-200 rounded-xl">Không tìm thấy Đoạn văn.</div>;;
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

  const renderPart7 = () => {
    if (!normalizedQ.content_1) return <div className="text-gray-400 p-4 text-center border-2 border-dashed border-gray-200 rounded-xl">Không tìm thấy Tài liệu số 1.</div>;
    const hasDoc2 = normalizedQ.content_2 && normalizedQ.content_2.trim() !== '';
    const hasDoc3 = normalizedQ.content_3 && normalizedQ.content_3.trim() !== '';

    return (
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
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

        <div className="w-full lg:w-2/5 flex flex-col gap-4">
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
                        return <div key={letter} className={`text-left p-2.5 border-2 rounded-xl text-xs transition-all ${style}`}>{opt}</div>;
                      })}
                    </div>
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
    'GRAMMAR_SURVIVAL': 'bg-violet-600'
  };
  const themeColor = badgeColors[currentPart] || 'bg-gray-500';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* BẢNG CÂU HỎI BÊN TRÁI (ẨN ĐI NẾU ĐANG CHƠI SINH TỒN) */}
        {currentPart !== 'GRAMMAR_SURVIVAL' && (
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
        )}

        {/* KHU VỰC CHÍNH HIỂN THỊ NỘI DUNG BÀI LÀM */}
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col">
          <header className="flex justify-between items-center mb-6">
            <button onClick={() => router.back()} className="text-sm text-gray-400 font-bold hover:text-gray-600 transition">← Thoát</button>
            <div className="flex items-center gap-4">
              {currentPart === 'PART 5' && streak > 1 && (
                <div className="text-orange-500 font-black animate-pulse flex items-center gap-1">
                  🔥 Combo x{streak}
                </div>
              )}
              {currentPart !== 'GRAMMAR_SURVIVAL' && (
                <div className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full text-white shadow-sm ${themeColor}`}>
                  {currentPart} | BÀI TẬP {currentIndex + 1}/{data.length}
                </div>
              )}
            </div>
          </header>

          {/* AUDIO CHO CÁC PHẦN NGHE */}
          {currentPart !== 'PART 5' && currentPart !== 'PART 6' && currentPart !== 'PART 7' && currentPart !== 'GRAMMAR_SURVIVAL' && (
            <audio key={normalizedQ.audiourl || currentIndex} controls className="w-full h-12 mb-8 shadow-sm rounded-lg bg-gray-50">
              <source src={normalizedQ.audiourl} type="audio/mpeg" />
              Trình duyệt không hỗ trợ Audio.
            </audio>
          )}

          {/* HIỂN THỊ THEO TỪNG CHẾ ĐỘ BÀI TẬP */}
          {currentPart === 'PART 1' && (
             <>
               <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-gray-700 font-semibold text-lg">{normalizedQ.maskedsentence || "Đang hiển thị hình ảnh..."}</p>
                  {normalizedQ.hint && normalizedQ.hint !== "undefined" && <p className="text-xs text-green-600 mt-3 font-medium">💡 Gợi ý: {normalizedQ.hint}</p>}
               </div>
               <textarea
                 className="w-full p-4 rounded-2xl bg-white border-2 border-gray-100 mb-6 focus:border-green-400 outline-none transition-all text-sm font-medium text-gray-900 placeholder-gray-400" 
                 rows="3" placeholder="Gõ đáp án vào đây..." value={userInput} onChange={(e) => setUserInput(e.target.value)} disabled={showResult}
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
              {renderPart2InputRow("Q", inputQ, setInputQ, normalizedQ.question)}
              <hr className="my-4 border-gray-200" />
              {renderPart2InputRow("A", inputA, setInputA, normalizedQ.optiona)}
              {renderPart2InputRow("B", inputB, setInputB, normalizedQ.optionb)}
              {renderPart2InputRow("C", inputC, setInputC, normalizedQ.optionc)}
            </div>
          )}

          {(currentPart === 'PART 3' || currentPart === 'PART 4') && renderClozeTest()}

          {currentPart === 'PART 5' && (
            <div className="mb-6">
              <div className="bg-red-50 p-8 rounded-2xl border border-red-100 mb-8 shadow-sm">
                <p className="text-xl font-bold text-gray-900 leading-relaxed text-center">{normalizedQ.question}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const isCorrectAns = (normalizedQ.correctoption || "").trim().toUpperCase() === opt;
                  const isSelected = selectedAnswer === opt;
                  let btnClass = "p-5 border-2 rounded-2xl text-left font-medium transition-all duration-300 text-gray-800 text-lg shadow-sm ";
                  if (!showResult) btnClass += "bg-white border-gray-200 hover:border-red-400 hover:shadow-md hover:-translate-y-1";
                  else {
                    if (isCorrectAns) btnClass += "bg-green-100 border-green-500 text-green-800 shadow-md";
                    else if (isSelected) btnClass += "bg-red-100 border-red-500 text-red-800";
                    else btnClass += "bg-gray-50 border-gray-200 opacity-50";
                  }
                  return (
                    <button key={opt} onClick={() => handleSelectPart5(opt)} className={btnClass} disabled={showResult}>
                      <span className="font-black mr-3 text-gray-400">{opt}.</span> {normalizedQ[`option${opt.toLowerCase()}`]}
                    </button>
                  );
                })}
              </div>
               {showResult && normalizedQ.explanation && (
                <div className="mt-6 p-5 bg-blue-50 border border-blue-200 rounded-2xl transition-all animate-fadeIn">
                  <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">💡 Giải thích chi tiết</h4>
                  <p className="text-blue-900 leading-relaxed">{normalizedQ.explanation}</p>
                </div>
              )}
            </div>
          )}
          
          {currentPart === 'PART 6' && renderPart6Document()}
          {currentPart === 'PART 7' && renderPart7()}

          {/* GIAO DIỆN CHẾ ĐỘ NGỮ PHÁP SINH TỒN (TIME ATTACK) */}
          {currentPart === 'GRAMMAR_SURVIVAL' && (
            <div className="flex flex-col max-w-3xl mx-auto w-full">
              {!isTimerRunning && !survivalGameOver && !survivalGameWon ? (
                <div className="text-center bg-violet-50 border border-violet-200 p-10 rounded-3xl shadow-sm">
                  <h2 className="text-4xl font-black text-violet-600 mb-4">CHẾ ĐỘ SINH TỒN</h2>
                  <p className="text-gray-700 font-medium mb-8">Bạn có <span className="text-violet-600 font-black">60 giây</span> ban đầu. Trả lời ĐÚNG được <span className="text-green-600 font-bold">+3 giây</span>. Trả lời SAI bị phạt <span className="text-red-600 font-bold">-5 giây</span>. Hãy cố gắng sống sót qua {data.length} câu hỏi!</p>
                  <button onClick={startSurvivalGame} className="bg-violet-600 hover:bg-violet-700 text-white font-black text-lg py-4 px-12 rounded-full shadow-lg transition-transform hover:scale-105">KÍCH HOẠT HỆ THỐNG 🚀</button>
                </div>
              ) : survivalGameOver ? (
                <div className="text-center bg-red-50 border border-red-200 p-10 rounded-3xl shadow-sm animate-fadeIn">
                  <h2 className="text-4xl font-black text-red-600 mb-4">TIME OUT! 💀</h2>
                  <p className="text-gray-700 font-medium mb-2">Hệ thống đã cạn năng lượng. Bạn đã vượt qua thành công <strong className="text-red-600 text-2xl mx-1">{totalScore}</strong> câu hỏi ngữ pháp.</p>
                  <div className="flex justify-center gap-4 mt-8">
                    <button onClick={startSurvivalGame} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl shadow-md transition">Chơi lại</button>
                    <button onClick={() => handleFinishExercise(totalScore)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-8 rounded-xl shadow-md transition">Rút lui & Lưu tiến trình</button>
                  </div>
                </div>
              ) : survivalGameWon ? (
                <div className="text-center bg-green-50 border border-green-200 p-10 rounded-3xl shadow-sm animate-fadeIn">
                  <h2 className="text-4xl font-black text-green-600 mb-4">CHIẾN THẮNG! 🏆</h2>
                  <p className="text-gray-700 font-medium mb-2">Đỉnh cao! Bạn đã xuất sắc hoàn thành trọn vẹn {data.length} câu hỏi trước khi đồng hồ dừng lại!</p>
                  <button onClick={() => handleFinishExercise(totalScore)} className="mt-8 bg-green-500 hover:bg-green-600 text-white font-black py-3 px-8 rounded-xl shadow-md transition-all">Hoàn tất bài tập</button>
                </div>
              ) : (
                <div className={`relative transition-all duration-300 ${flashState === 'correct' ? 'scale-[1.01] drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]' : flashState === 'wrong' ? 'scale-[0.99] drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]' : ''}`}>
                  {/* THANH THỜI GIAN VÀ ĐIỂM SỐ CHẾ ĐỘ SINH TỒN */}
                  <div className="flex justify-between items-center mb-6 bg-white border border-gray-200 p-4 px-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className={`text-3xl font-black tracking-tight ${timeLeft <= 12 ? 'text-red-500 animate-pulse' : 'text-violet-600'}`}>{timeLeft}s</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Năng lượng thời gian</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-green-500 font-mono">{totalScore} / {data.length}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase block tracking-wider">Hạ gục bẫy</span>
                    </div>
                  </div>

                  {/* KHUNG CÂU HỎI NGỮ PHÁP */}
                  <div className="bg-violet-50/60 p-8 rounded-2xl border border-violet-100 mb-6 shadow-inner text-center">
                    <p className="text-xl font-bold text-gray-900 leading-relaxed">{normalizedQ.question}</p>
                  </div>

                  {/* DANH SÁCH ĐÁP ÁN PHẢN XẠ NHANH */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const isCorrectAns = (normalizedQ.correctoption || "").trim().toUpperCase() === opt;
                      let btnClass = "p-5 border-2 rounded-2xl text-left font-medium transition-all duration-150 text-gray-800 text-lg shadow-sm ";
                      
                      if (!flashState) {
                        btnClass += "bg-white border-gray-200 hover:border-violet-400 hover:bg-violet-50/30 active:scale-[0.99]";
                      } else {
                        if (isCorrectAns) btnClass += "bg-green-100 border-green-500 text-green-800 font-bold";
                        else btnClass += "bg-gray-50 border-gray-200 opacity-40";
                      }

                      return (
                        <button key={opt} onClick={() => handleSelectSurvival(opt)} disabled={!!flashState} className={btnClass}>
                          <span className="font-black mr-3 text-gray-400">{opt}.</span> {normalizedQ[`option${opt.toLowerCase()}`]}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* POPUP SỐ GIÂY CỘNG TRỪ */}
                  {flashState === 'correct' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-green-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] z-50 animate-bounce">+3s</div>}
                  {flashState === 'wrong' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] z-50 animate-bounce">-5s</div>}
                </div>
              )}
            </div>
          )}

          {/* HIỂN THỊ BẢN DỊCH CHO PART 6 HOẶC PART 7 KHI ĐÃ CÓ KẾT QUẢ */}
          {showResult && (currentPart === 'PART 6' || currentPart === 'PART 7') && normalizedQ.translation && (
            <div className="mt-2 p-6 bg-slate-50 border border-slate-200 rounded-2xl transition-all shadow-sm">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base"><b>🇻🇳 Bản dịch Tiếng Việt toàn văn</b></h4>
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line border-t border-slate-200 pt-3">{normalizedQ.translation}</p>
            </div>
          )}

          {/* THANH ĐIỀU HƯỚNG CHUNG CUỐI TRANG (TỰ ĐỘNG ẨN TRONG CHẾ ĐỘ SINH TỒN) */}
          {currentPart !== 'GRAMMAR_SURVIVAL' && (
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
          )}
        </div>

        {/* CỘT PHẢI HIỂN THỊ BẢNG TỪ VỰNG CHUNG (ẨN KHI ĐANG TRONG TRẬN SINH TỒN) */}
        {showResult && vocabList.length > 0 && currentPart !== 'GRAMMAR_SURVIVAL' && (
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