'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { db } from '@/firebase'; 
import { collection, getDocs, doc, getDoc, query } from 'firebase/firestore';

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
  
  const [testInfo, setTestInfo] = useState(null); 
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activePart, setActivePart] = useState(1);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeft, setTimeLeft] = useState(7200); 

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  useEffect(() => {
    if (!book || !testId) return;

    async function loadTestData() {
      try {
        setLoading(true);

        // Chuẩn hóa tên sách cho đúng format
        let upperBook = book.toUpperCase();
        if (upperBook === 'HACKER2') upperBook = 'HACKER 2';
        if (upperBook === 'HACKER3') upperBook = 'HACKER 3';

        // Tạo ID cơ bản với format 2 chữ số (VD: HACKER 3_01, ETS2026_10)
        const formattedTestId = testId.padStart(2, '0');
        let docId = `${upperBook}_${formattedTestId}`; 

        let testRef = doc(db, 'toeic_tests', docId);
        let testSnap = await getDoc(testRef);

        // Fallback: Nếu không tìm thấy, thử tìm với ID không có số 0 ở đầu (VD: HACKER 3_1)
        if (!testSnap.exists()) {
           docId = `${upperBook}_${testId}`;
           testRef = doc(db, 'toeic_tests', docId);
           testSnap = await getDoc(testRef);
        }

        if (testSnap.exists()) {
           setTestInfo(testSnap.data());
           
           const qRef = collection(db, `toeic_tests/${docId}/questions`);
           const querySnapshot = await getDocs(query(qRef));
           
           const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
           data.sort((a, b) => parseInt(a.id) - parseInt(b.id)); 
           setQuestions(data);
        } else {
           console.error("Không tìm thấy đề thi với ID:", docId);
        }
      } catch (err) {
        console.error("Lỗi khi load đề:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTestData();
  }, [book, testId]);

  useEffect(() => {
    if (loading || timeLeft <= 0 || isSubmitted) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, isSubmitted]);

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitted) {
      calculateAndSubmit();
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectOption = (questionId, option) => {
    if (!isSubmitted) {
      setAnswers(prev => ({ ...prev, [questionId]: option }));
    }
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

  const calculateAndSubmit = () => {
    let listeningCorrect = 0;
    let readingCorrect = 0;
    let partsAccuracy = { 1: { c: 0, t: 6 }, 2: { c: 0, t: 25 }, 3: { c: 0, t: 39 }, 4: { c: 0, t: 30 }, 5: { c: 0, t: 30 }, 6: { c: 0, t: 16 }, 7: { c: 0, t: 54 } };

    questions.forEach(q => {
      const correctAns = (q.correct_answer || q.correctOption || '').trim().toUpperCase();
      const userAns = answers[q.id];
      const part = getPartByQuestionId(q.id);

      if (userAns === correctAns) {
        if (part <= 4) listeningCorrect++;
        else readingCorrect++;
        partsAccuracy[part].c++;
      }
    });

    setScoreResult({
      totalCorrect: listeningCorrect + readingCorrect,
      listeningCorrect,
      readingCorrect,
      partsAccuracy
    });
    setIsSubmitted(true);
    setShowSubmitModal(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase">Đang nạp phòng thi chuẩn IIG...</p>
      </div>
    );
  }

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
            {isSubmitted ? (
              <p className="text-[10px] text-emerald-500 font-bold uppercase">✅ CHẾ ĐỘ XEM LẠI (REVIEW MODE)</p>
            ) : (
              <p className="text-[10px] text-blue-500 font-bold uppercase">{mode === 'full' ? '🔥 Thi Thật' : '🌱 Luyện Tập'}</p>
            )}
          </div>
        </div>
        
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
          <div className={`flex items-center gap-2 border px-3 py-1 lg:px-4 lg:py-1.5 rounded-lg ${timeLeft < 300 && !isSubmitted ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            <span className="text-lg hidden sm:inline">⏱</span>
            <span className="font-mono font-bold text-lg tracking-wider">{formatTime(timeLeft)}</span>
          </div>
          {!isSubmitted && (
            <button onClick={() => setShowSubmitModal(true)} className="bg-blue-600 text-white font-bold text-sm lg:text-base px-4 py-1.5 lg:px-6 lg:py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all">Nộp Bài</button>
          )}
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 lg:p-8">
          <div className="max-w-6xl mx-auto w-full">
            
            {activePart <= 4 && testInfo?.full_audio_url && (
              <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-blue-100 mb-6 sticky top-0 z-20">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">🎧</span> File Nghe Audio Toàn Bài
                </h3>
                <audio 
                  key={testInfo.full_audio_url} 
                  controls 
                  crossOrigin="anonymous"
                  className="w-full h-12 outline-none rounded-lg"
                >
                  <source src={testInfo.full_audio_url.replace(/\s+/g, '')} type="audio/mpeg" />
                </audio>
              </div>
            )}

            <div className="mb-6 flex justify-between items-end">
              <h2 className="text-2xl font-black text-slate-800">Part {activePart}</h2>
              {isSubmitted && <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 shadow-sm">Đang xem giải thích</span>}
            </div>

            {groupedQuestions.map((group) => {
              const isListeningWithText = (activePart === 3 || activePart === 4);
              const showPassage = group.passageContent && (activePart >= 5 || (isListeningWithText && isSubmitted));
              const showImage = !!group.imageUrl;
              const hasContext = showPassage || showImage;

              return (
                <div key={group.groupId} className={`bg-white rounded-2xl shadow-sm border ${isSubmitted ? 'border-emerald-100' : 'border-gray-200'} mb-8 overflow-hidden flex flex-col ${hasContext ? 'lg:flex-row' : ''}`}>
                  
                  {hasContext && (
                    <div className="w-full lg:w-1/2 p-6 lg:p-8 bg-slate-50 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col justify-start">
                      
                      {/* XỬ LÝ NHIỀU HÌNH ẢNH CÙNG LÚC */}
                      {showImage && (
                        <div className="flex flex-col gap-6">
                          {group.imageUrl.split(/[|\n,]+/).map((imgUrl, idx) => {
                            const cleanUrl = imgUrl.trim();
                            if (!cleanUrl) return null;
                            return (
                              <img 
                                key={idx} 
                                src={cleanUrl} 
                                alt={`TOEIC Resource ${idx + 1}`} 
                                className="max-w-full rounded-xl shadow-sm border border-gray-200 mx-auto" 
                              />
                            );
                          })}
                        </div>
                      )}
                      
                      {showPassage && (
                        <div className={`mt-4 ${showImage ? 'pt-6 border-t border-dashed border-gray-300' : ''}`}>
                          {isListeningWithText && isSubmitted && <div className="text-xs font-black text-blue-500 uppercase mb-2 tracking-widest">Transcript / Audio Script</div>}
                          <div 
                            className="prose max-w-none text-slate-800 text-sm lg:text-base leading-loose whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: group.passageContent }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`w-full p-6 lg:p-8 ${hasContext ? 'lg:w-1/2' : ''}`}>
                    {group.questions.map((q, idx) => {
                      const isListeningNoText = (activePart === 1 || activePart === 2) && !isSubmitted;
                      const optionKeys = activePart === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
                      
                      const correctAns = (q.correct_answer || q.correctOption || '').trim().toUpperCase();
                      const userAns = answers[q.id];
                      const isCorrect = userAns === correctAns;

                      return (
                        <div key={q.id} id={`question-${q.id}`} className={`relative group ${idx !== 0 ? 'mt-8 pt-8 border-t border-dashed border-gray-200' : ''}`}>
                          
                          {!isSubmitted && (
                            <button onClick={() => toggleFlag(q.id)} title="Cắm cờ xem lại" className={`absolute top-0 right-0 p-2 rounded-full transition-all ${flagged[q.id] ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:bg-gray-50'}`}>🚩</button>
                          )}

                          <div className="flex gap-3 mb-5 pr-10">
                            <span className={`w-8 h-8 shrink-0 font-black rounded-full flex items-center justify-center text-sm shadow-sm ${isSubmitted ? (isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-800 text-white'}`}>
                              {q.id}
                            </span>
                            <p className={`font-semibold text-base lg:text-lg leading-relaxed mt-0.5 ${isListeningNoText ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                              {isListeningNoText ? "Mark your answer on your answer sheet." : (q.question || `Question ${q.id}`)}
                            </p>
                          </div>

                          <div className={`pl-11 ${isListeningNoText ? 'flex flex-wrap gap-4' : 'grid grid-cols-1 gap-3'}`}>
                            {optionKeys.map(opt => {
                              const optionText = q[`option${opt}`] || q[`option_${opt.toLowerCase()}`];
                              if (!isListeningNoText && !optionText) return null; 
                              
                              const isSelected = userAns === opt;
                              const isTrueOption = correctAns === opt;

                              let btnClass = 'border-slate-100 hover:border-blue-300 hover:bg-slate-50 text-slate-600';
                              let badgeClass = 'bg-slate-200 text-slate-500';
                              
                              if (isSubmitted) {
                                if (isTrueOption) {
                                  btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-md';
                                  badgeClass = 'bg-emerald-500 text-white';
                                } else if (isSelected && !isTrueOption) {
                                  btnClass = 'border-rose-400 bg-rose-50 text-rose-800 line-through font-semibold shadow-sm';
                                  badgeClass = 'bg-rose-500 text-white';
                                } else {
                                  btnClass = 'border-slate-200 bg-white text-slate-600 font-medium';
                                }
                              } else {
                                if (isSelected) {
                                  btnClass = 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm';
                                  badgeClass = 'bg-blue-500 text-white';
                                }
                              }

                              if (isListeningNoText) {
                                return (
                                  <button key={opt} onClick={() => handleSelectOption(q.id, opt)} disabled={isSubmitted}
                                    className={`w-12 h-12 shrink-0 flex items-center justify-center border-2 rounded-full font-black text-base transition-all ${isSubmitted ? '' : 'hover:scale-105'} ${btnClass}`}>
                                    {opt}
                                  </button>
                                );
                              }

                              return (
                                <button key={opt} onClick={() => handleSelectOption(q.id, opt)} disabled={isSubmitted}
                                  className={`flex items-start gap-3 p-3.5 border-2 rounded-xl transition-all duration-200 text-left ${btnClass}`}>
                                  <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-black transition-colors ${badgeClass}`}>{opt}</span>
                                  <span className="leading-relaxed text-sm lg:text-base" dangerouslySetInnerHTML={{ __html: optionText }} />
                                </button>
                              );
                            })}
                          </div>

                          {isSubmitted && q.explanation && (
                            <div className="pl-11 mt-4">
                              <div className="p-5 rounded-xl border-2 border-emerald-200 bg-emerald-50 shadow-sm">
                                <div className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                  <span className="text-base">💡</span> GIẢI THÍCH CHI TIẾT
                                </div>
                                <div className="text-sm leading-relaxed text-slate-800 font-semibold" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}

          </div>
        </div>

        {/* SIDEBAR BẢNG ĐÁP ÁN */}
        <aside className="hidden lg:flex w-72 bg-white border-l border-gray-200 flex-col shrink-0 z-20 shadow-xl">
          <div className="p-5 border-b border-gray-100 bg-slate-50">
            <h3 className="font-black text-slate-800 text-lg">Bảng Trả Lời</h3>
            {!isSubmitted ? (
              <div className="flex justify-between mt-3 text-xs font-bold text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div> Đã làm: <span className="text-slate-800">{Object.keys(answers).length}</span></span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div> Xem lại: <span className="text-slate-800">{Object.values(flagged).filter(Boolean).length}</span></span>
              </div>
            ) : (
              <div className="flex justify-between mt-3 text-xs font-bold bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                 <span className="text-emerald-600 flex items-center gap-1">✅ {scoreResult?.totalCorrect} Đúng</span>
                 <span className="text-rose-500 flex items-center gap-1">❌ {200 - (scoreResult?.totalCorrect || 0)} Sai/Bỏ</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-full h-px bg-blue-100"></span> LISTENING <span className="w-full h-px bg-blue-100"></span></h4>
            <div className="grid grid-cols-5 gap-2 mb-8">
              {[...Array(100)].map((_, i) => {
                const id = i + 1;
                const userAns = answers[id];
                
                let bubbleClass = 'border-slate-200 text-slate-500 hover:border-blue-400 hover:bg-blue-50';
                if (isSubmitted) {
                  const q = questions.find(q => parseInt(q.id) === id);
                  const isCorrect = q && userAns === (q.correct_answer || q.correctOption || '').trim().toUpperCase();
                  if (isCorrect) bubbleClass = 'bg-emerald-500 border-emerald-500 text-white shadow-sm';
                  else bubbleClass = 'bg-rose-500 border-rose-500 text-white shadow-sm';
                } else if (userAns) {
                  bubbleClass = 'bg-blue-500 border-blue-500 text-white shadow-md';
                }

                return (
                  <button key={id} onClick={() => scrollToQuestion(id)} className={`aspect-square border rounded-lg flex flex-col items-center justify-center transition-all relative group ${bubbleClass}`}>
                    <span className="text-xs font-bold">{id}</span>
                    {userAns && <span className="text-[9px] font-black leading-none mt-0.5">{userAns}</span>}
                    {flagged[id] && !isSubmitted && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>}
                  </button>
                );
              })}
            </div>

            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-full h-px bg-rose-100"></span> READING <span className="w-full h-px bg-rose-100"></span></h4>
            <div className="grid grid-cols-5 gap-2 pb-10">
              {[...Array(100)].map((_, i) => {
                const id = i + 101;
                const userAns = answers[id];

                let bubbleClass = 'border-slate-200 text-slate-500 hover:border-rose-400 hover:bg-rose-50';
                if (isSubmitted) {
                  const q = questions.find(q => parseInt(q.id) === id);
                  const isCorrect = q && userAns === (q.correct_answer || q.correctOption || '').trim().toUpperCase();
                  if (isCorrect) bubbleClass = 'bg-emerald-500 border-emerald-500 text-white shadow-sm';
                  else bubbleClass = 'bg-rose-500 border-rose-500 text-white shadow-sm';
                } else if (userAns) {
                  bubbleClass = 'bg-rose-500 border-rose-500 text-white shadow-md';
                }

                return (
                  <button key={id} onClick={() => scrollToQuestion(id)} className={`aspect-square border rounded-lg flex flex-col items-center justify-center transition-all relative group ${bubbleClass}`}>
                    <span className="text-[11px] font-bold">{id}</span>
                    {userAns && <span className="text-[9px] font-black leading-none mt-0.5">{userAns}</span>}
                    {flagged[id] && !isSubmitted && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* --- POPUP XÁC NHẬN NỘP BÀI --- */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200 text-center">
             <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🤔</div>
             <h3 className="text-xl font-black text-slate-800 mb-2">Bạn muốn nộp bài?</h3>
             <p className="text-sm text-slate-500 mb-6">
               Bạn đã trả lời <strong className="text-slate-800">{Object.keys(answers).length}/200</strong> câu hỏi.<br/>
               Vẫn còn <strong className="text-rose-500">{200 - Object.keys(answers).length}</strong> câu chưa làm.
             </p>
             <div className="flex gap-3">
               <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Quay lại làm tiếp</button>
               <button onClick={calculateAndSubmit} className="flex-1 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md">Nộp bài ngay</button>
             </div>
          </div>
        </div>
      )}

      {/* --- MÀN HÌNH BÁO CÁO KẾT QUẢ TỔNG QUAN --- */}
      {isSubmitted && scoreResult && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight uppercase mb-2">Hoàn Thành Bài Thi</h1>
            <p className="text-emerald-400 font-bold tracking-widest uppercase">Phân tích kết quả chuẩn IIG</p>
          </div>
          
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
            
            <div className="flex-1 text-center border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-8">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Số câu trả lời đúng</div>
              <div className="text-6xl font-black text-slate-800 mb-2">{scoreResult.totalCorrect}<span className="text-2xl text-slate-300">/200</span></div>
              <div className="flex justify-center gap-4 text-xs font-bold mt-4">
                 <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">🎧 LC: {scoreResult.listeningCorrect}/100</div>
                 <div className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg">📖 RC: {scoreResult.readingCorrect}/100</div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hiệu suất theo từng phần</h4>
              {[1,2,3,4,5,6,7].map(part => {
                 const stat = scoreResult.partsAccuracy[part];
                 const percent = Math.round((stat.c / stat.t) * 100);
                 const barColor = percent >= 80 ? 'bg-emerald-400' : percent >= 50 ? 'bg-amber-400' : 'bg-rose-400';
                 return (
                   <div key={part} className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-slate-500 w-10">PART {part}</span>
                     <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                     </div>
                     <span className="text-[10px] font-bold text-slate-700 w-6 text-right">{stat.c}/{stat.t}</span>
                   </div>
                 )
              })}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button onClick={() => router.push('/home')} className="px-8 py-3 font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition shadow-lg">← Về trang chủ</button>
            <button onClick={() => setScoreResult(null)} className="px-8 py-3 font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-lg shadow-emerald-500/20">Xem giải thích chi tiết</button>
          </div>
        </div>
      )}

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