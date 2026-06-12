'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const VOCAB_TOPICS = [
  { id: 1, title: 'Hợp đồng & Đàm phán', subtitle: 'Contracts' },
  { id: 2, title: 'Marketing & Quảng cáo', subtitle: 'Marketing' },
  { id: 3, title: 'Phát triển doanh nghiệp', subtitle: 'Business' },
  { id: 4, title: 'Hội nghị & Sự kiện', subtitle: 'Conferences' },
  { id: 5, title: 'Tuyển dụng & Nhân sự', subtitle: 'Employment' },
  { id: 6, title: 'Mua sắm & Đặt hàng', subtitle: 'Purchasing' },
  { id: 7, title: 'Ngân hàng & Tài chính', subtitle: 'Banking' },
  { id: 8, title: 'Kế toán & Thuế', subtitle: 'Accounting' },
  { id: 9, title: 'Quản lý văn phòng', subtitle: 'Office Corporate' },
  { id: 10, title: 'Quản lý nhân viên', subtitle: 'Personnel' },
  { id: 11, title: 'Du lịch & Khách sạn', subtitle: 'Travel' },
  { id: 12, title: 'Giải trí & Ăn uống', subtitle: 'Entertainment' },
  { id: 13, title: 'Sức khỏe & Y tế', subtitle: 'Health' },
];

function parseCSVToJSON(csvText) {
  const lines = csvText.split(/\r?\n/);
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let insideQuote = false;
    let currentCell = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    
    if (row.length >= 3) {
      const clean = (val) => val ? val.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';
      result.push({
        word: clean(row[0]),
        ipa: clean(row[1]),
        meaning: clean(row[2]),
        example: clean(row[3]) || 'Chưa có câu ví dụ minh họa.'
      });
    }
  }
  return result;
}

function shuffleArray(array) {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

function VocabularyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'learn'; 
  const topicId = searchParams.get('topic'); 
  const isResume = searchParams.get('resume') === 'true';

  const topic = VOCAB_TOPICS.find(t => String(t.id) === String(topicId));

  const [shuffledPool, setShuffledPool] = useState([]); 
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States các chế độ học (Dùng chung tên index để dễ lưu)
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isFlipped, setIsFlipped] = useState(false); 

  const [currentRound, setCurrentRound] = useState(1); 
  const [matchCards, setMatchCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [wrongCards, setWrongCards] = useState([]); 
  const [correctCards, setCorrectCards] = useState([]); 
  const [isChecking, setIsChecking] = useState(false);

  const [userAnswer, setUserAnswer] = useState('');
  const [listenChecked, setListenChecked] = useState(false);
  const [listenResult, setListenResult] = useState(null); 
  const [voiceAccent, setVoiceAccent] = useState('en-US'); 

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const [typerInput, setTyperInput] = useState('');
  const [typerScore, setTyperScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15); 
  const [isTyperFinished, setIsTyperFinished] = useState(false);

  const [gameInput, setGameInput] = useState('');
  const [gameScore, setGameScore] = useState(0);
  const [gameHealth, setGameHealth] = useState(3); 
  const [wordYPos, setWordYPos] = useState(0); 
  const [isGameOver, setIsGameOver] = useState(false);
  const [laserEffect, setLaserEffect] = useState(false);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  const gameLoopRef = useRef(null);
  const gameIndexRef = useRef(currentIndex);
  const shuffledPoolRef = useRef(shuffledPool);

  useEffect(() => { gameIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { shuffledPoolRef.current = shuffledPool; }, [shuffledPool]);

  // ĐỒNG BỘ DỮ LIỆU BAN ĐẦU
  useEffect(() => {
    if (!topicId) return;

    async function fetchAndParseExcelData() {
      try {
        setLoading(true);
        setError(null);
        
        // Reset states
        setIsFlipped(false);
        setCurrentIndex(0);
        setUserAnswer('');
        setListenChecked(false);
        setListenResult(null);
        setSelectedOption(null);
        setQuizChecked(false);
        setQuizScore(0);
        setTyperInput('');
        setTyperScore(0);
        setTimeLeft(15);
        setIsTyperFinished(false);
        setGameInput('');
        setGameScore(0);
        setGameHealth(3);
        setWordYPos(0);
        setIsGameOver(false);
        setLaserEffect(false);

        // Lấy dữ liệu từ file csv
        const docSnap = await getDoc(doc(db, 'vocab_lessons', String(topicId)));
        if (!docSnap.exists()) throw new Error('Chưa cấu hình dữ liệu bài học.');

        const data = docSnap.data();
        let rawUrl = data.vocabUrl;
        if (!rawUrl) throw new Error('Đường dẫn trích xuất file đang trống.');

        let exportCsvUrl = rawUrl;
        if (rawUrl.includes('/edit')) {
          exportCsvUrl = rawUrl.split('/edit')[0] + '/export?format=csv';
        } else if (!rawUrl.includes('/export')) {
          const match = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            exportCsvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
          }
        }

        const response = await fetch(exportCsvUrl);
        const csvText = await response.text();
        const parsedData = parseCSVToJSON(csvText);
        
        if (parsedData.length === 0) throw new Error('File tài liệu rỗng.');

        setWords(parsedData);
        const randomizedPool = shuffleArray([...parsedData]);
        setShuffledPool(randomizedPool);

        // Xử lý học tiếp (Resume)
        let savedIndex = 0;
        let savedScore = 0;
        if (CURRENT_USER_ID && isResume) {
          const progressSnap = await getDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `vocab_${mode}_${topicId}`));
          if (progressSnap.exists()) {
             const progData = progressSnap.data();
             if (progData.currentIndex) savedIndex = progData.currentIndex;
             if (progData.score) savedScore = progData.score;
          }
        }
        setCurrentIndex(savedIndex);
        if (mode === 'quiz') setQuizScore(savedScore);
        if (mode === 'typer') setTyperScore(savedScore);
        if (mode === 'invaders') setGameScore(savedScore);

        // Chuẩn bị dữ liệu riêng cho từng mode
        if (mode === 'match') {
          const itemsPerRound = 10;
          const roundWords = randomizedPool.slice(0, itemsPerRound);
          let generatedCards = [];
          roundWords.forEach((item, index) => {
            generatedCards.push({ uniqueId: `w_1_${index}`, pairId: index, content: item.word, type: 'word' });
            generatedCards.push({ uniqueId: `m_1_${index}`, pairId: index, content: item.meaning, type: 'meaning' });
          });
          setMatchCards(shuffleArray(generatedCards));
        }

        if (mode === 'quiz') {
          const generatedQuestions = randomizedPool.map((item) => {
            const distractors = parsedData.filter(w => w.word !== item.word).map(w => w.word);
            const randomDistractors = shuffleArray(distractors).slice(0, 3);
            const options = shuffleArray([item.word, ...randomDistractors]);
            return {
              correctAnswer: item.word,
              ipa: item.ipa,
              meaning: item.meaning,
              example: item.example,
              maskedSentence: item.example.replace(new RegExp(`\\b${item.word}\\b`, 'gi'), '_____'),
              options: options
            };
          });
          setQuizQuestions(generatedQuestions);
        }

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAndParseExcelData();
  }, [topicId, mode, isResume]);

  // LƯU TIẾN TRÌNH KHI ĐANG HỌC
  useEffect(() => {
    async function saveProgress() {
      if (!CURRENT_USER_ID || loading || words.length === 0) return;
      // Chỉ lưu "đang học" nếu chưa tới câu cuối
      if (currentIndex > 0 && currentIndex < words.length - 1) {
        let currentScore = 0;
        if (mode === 'quiz') currentScore = quizScore;
        if (mode === 'typer') currentScore = typerScore;
        if (mode === 'invaders') currentScore = gameScore;

        try {
          await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `vocab_${mode}_${topicId}`), {
            status: 'in_progress',
            currentIndex: currentIndex,
            score: currentScore,
            totalQuestions: words.length,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Lỗi khi lưu tiến trình tạm thời:", error);
        }
      }
    }
    saveProgress();
  }, [currentIndex, CURRENT_USER_ID, mode, topicId, loading, words.length, quizScore, typerScore, gameScore]);


  // TIMER COUNTDOWN (Đua tốc độ phản xạ)
  useEffect(() => {
    if (mode !== 'typer' || isTyperFinished || loading || shuffledPool.length === 0) return;
    if (timeLeft === 0) { handleNextTyperWord(); return; }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, mode, isTyperFinished, loading, shuffledPool]);

  // ARCADE PHYSICS (Vượt chướng ngại vật)
  useEffect(() => {
    if (mode !== 'invaders' || isGameOver || loading || shuffledPool.length === 0) return;
    const speedFactor = 0.5 + (gameScore * 0.05); 
    gameLoopRef.current = setInterval(() => {
      setWordYPos((prevY) => {
        if (prevY >= 82) { 
          handleWordCrash();
          return 0;
        }
        return prevY + speedFactor;
      });
    }, 160);
    return () => clearInterval(gameLoopRef.current);
  }, [mode, isGameOver, loading, shuffledPool, currentIndex, gameScore]);

  const handleWordCrash = () => {
    setGameHealth((prevHealth) => {
      const nextHealth = prevHealth - 1;
      if (nextHealth <= 0) {
        setIsGameOver(true);
        clearInterval(gameLoopRef.current);
        setTimeout(() => { handleFinishSession(gameScore); }, 600);
      }
      return nextHealth;
    });
    setGameInput('');
    setWordYPos(0);
    goToNextInvadersWord();
  };

  const goToNextInvadersWord = () => {
    const currentIndexVal = gameIndexRef.current;
    if (currentIndexVal < shuffledPoolRef.current.length - 1) setCurrentIndex(prev => prev + 1);
    else {
      setIsGameOver(true);
      clearInterval(gameLoopRef.current);
      handleFinishSession(gameScore);
    }
  };

  const handleInvadersInputChange = (e) => {
    const val = e.target.value;
    setGameInput(val);
    const target = shuffledPool[currentIndex]?.word.toLowerCase().trim();
    if (val.toLowerCase().trim() === target) {
      setLaserEffect(true);
      setGameScore(p => p + 1);
      setTimeout(() => {
        setLaserEffect(false);
        setWordYPos(0);
        setGameInput('');
        goToNextInvadersWord();
      }, 250);
    }
  };

  const playAudio = (text, type = 'word') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceAccent;
    utterance.rate = type === 'word' ? 0.9 : 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const handleFinishSession = async (finalScore = null) => {
    if (!CURRENT_USER_ID) {
      router.back();
      return;
    }
    const scoreToSave = finalScore !== null ? finalScore : words.length;
    const totalToSave = shuffledPool.length;
    
    try {
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `vocab_${mode}_${topicId}`), {
        status: 'completed',
        currentIndex: 0, // Reset index khi hoàn thành
        score: scoreToSave,
        totalQuestions: totalToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert(`🎉 Hoàn thành bài học!`);
      router.back();
    } catch (err) {
      router.back();
    }
  };

  const goToFlashcard = (idx) => {
    setIsFlipped(false);
    setCurrentIndex(idx);
  };

  const goToListen = (idx) => {
    setCurrentIndex(idx);
    setUserAnswer('');
    setListenChecked(false);
    setListenResult(null);
  };

  const goToQuiz = (idx) => {
    setCurrentIndex(idx);
    setSelectedOption(null);
    setQuizChecked(false);
  };

  const handleCheckListenAnswer = () => {
    if (!userAnswer.trim()) return;
    const correctAnswer = shuffledPool[currentIndex]?.word.toLowerCase().trim();
    setListenChecked(true);
    setListenResult(userAnswer.toLowerCase().trim() === correctAnswer ? 'correct' : 'wrong');
  };

  const handleCheckQuizAnswer = () => {
    if (!selectedOption || quizChecked) return;
    setQuizChecked(true);
    if (selectedOption === quizQuestions[currentIndex].correctAnswer) setQuizScore(p => p + 1);
  };

  const handleTyperInputChange = (e) => {
    const val = e.target.value;
    setTyperInput(val);
    const target = shuffledPool[currentIndex]?.word.toLowerCase().trim();
    if (val.toLowerCase().trim() === target) {
      setTyperScore(p => p + 1);
      handleNextTyperWord();
    }
  };

  const handleNextTyperWord = () => {
    setTyperInput('');
    setTimeLeft(15);
    if (currentIndex < shuffledPool.length - 1) setCurrentIndex(p => p + 1);
    else handleFinishSession(typerScore + 1);
  };

  const handleCardClick = (card) => {
    if (isChecking || matchedCards.includes(card.uniqueId) || selectedCards.some(c => c.uniqueId === card.uniqueId)) return;
    const newSelection = [...selectedCards, card];
    setSelectedCards(newSelection);

    if (newSelection.length === 2) {
      setIsChecking(true);
      const [first, second] = newSelection;
      if (first.pairId === second.pairId && first.type !== second.type) {
        setCorrectCards([first.uniqueId, second.uniqueId]);
        setTimeout(() => {
          setMatchedCards(prev => {
            const updated = [...prev, first.uniqueId, second.uniqueId];
            if (updated.length === matchCards.length) {
              const nextRound = currentRound + 1;
              setTimeout(() => {
                if (nextRound <= 5 && (nextRound - 1) * 10 < shuffledPool.length) {
                  setCurrentRound(nextRound);
                  generateRoundCards(shuffledPool, nextRound);
                } else handleFinishSession();
              }, 600);
            }
            return updated;
          });
          setSelectedCards([]);
          setCorrectCards([]);
          setIsChecking(false);
        }, 300);
      } else {
        setWrongCards([first.uniqueId, second.uniqueId]);
        setTimeout(() => { setSelectedCards([]); setWrongCards([]); setIsChecking(false); }, 800);
      }
    }
  };

  const handleExit = () => {
    router.back();
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-xs font-bold gap-3"><div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />Đang nạp dữ liệu từ vựng...</div>;

  switch (mode) {
    case 'flashcard':
      const currentCard = words[currentIndex];
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={handleExit} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">🃏 Flashcards — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{currentIndex + 1}/{words.length}</span>
          </header>
          
          <div className="flex-1 flex flex-col lg:flex-row p-4 max-w-6xl w-full mx-auto gap-8 items-start justify-center mt-6">
            <div className="w-full lg:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
              <h3 className="font-bold mb-4 uppercase text-sm text-center text-green-500">Danh sách từ vựng</h3>
              <div className="grid grid-cols-5 gap-2">
                {words.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToFlashcard(i)}
                    className={`py-2 rounded-lg font-bold text-sm transition-all ${
                      currentIndex === i 
                        ? 'bg-green-500 text-white shadow-md scale-105' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full max-w-xl flex flex-col gap-6">
              <div onClick={() => setIsFlipped(!isFlipped)} className="w-full h-80 cursor-pointer [perspective:1000px] select-none">
                <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                  <div className="absolute inset-0 w-full h-full rounded-3xl bg-white border border-gray-100 shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
                    <h2 className="text-4xl font-black text-gray-800 tracking-tight">{currentCard?.word}</h2>
                    <p className="text-sm font-semibold text-gray-400 mt-2 bg-gray-50 px-3 py-1 rounded-full">{currentCard?.ipa}</p>
                  </div>
                  <div className="absolute inset-0 w-full h-full rounded-3xl bg-emerald-500 text-white shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <h3 className="text-2xl font-bold px-2">{currentCard?.meaning}</h3>
                    <p className="text-xs font-medium max-w-sm italic leading-relaxed mt-4">"{currentCard?.example}"</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between w-full gap-4 mt-2">
                {currentIndex > 0 && (
                  <button onClick={() => goToFlashcard(currentIndex - 1)} className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold text-xs p-4 rounded-xl shadow-sm hover:bg-gray-50">← Từ trước</button>
                )}
                <button onClick={() => {
                  if (currentIndex < words.length - 1) goToFlashcard(currentIndex + 1);
                  else handleFinishSession();
                }} className="flex-1 bg-green-400 hover:bg-green-500 text-white font-bold text-xs p-4 rounded-xl shadow-md transition-all">
                  {currentIndex < words.length - 1 ? 'Từ tiếp theo →' : 'Hoàn thành bài tập'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );

    case 'listen':
      const currentListenWord = shuffledPool[currentIndex];
      const maskedExample = currentListenWord?.example.replace(new RegExp(`\\b${currentListenWord?.word}\\b`, 'gi'), '[...]');
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={handleExit} className="bg-white/20 rounded-lg p-1.5 px-3 text-white text-xs font-bold">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">🎧 Luyện nghe — {topic?.title}</span>
          </header>
          
          <div className="flex-1 flex flex-col lg:flex-row p-4 max-w-6xl w-full mx-auto gap-8 items-start justify-center mt-6">
            <div className="w-full lg:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
              <h3 className="font-bold mb-4 uppercase text-sm text-center text-green-500">Danh sách câu</h3>
              <div className="grid grid-cols-5 gap-2">
                {shuffledPool.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToListen(i)}
                    className={`py-2 rounded-lg font-bold text-sm transition-all ${
                      currentIndex === i 
                        ? 'bg-green-500 text-white shadow-md scale-105' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 max-w-xl w-full flex flex-col items-center gap-6">
              <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col items-center gap-6 text-center">
                <button onClick={() => playAudio(currentListenWord?.word, 'word')} className="w-20 h-20 bg-green-50 text-green-500 hover:bg-green-100 rounded-full flex items-center justify-center text-3xl border-none cursor-pointer transition-transform active:scale-95">🔊</button>
                <div className="w-full bg-gray-50 rounded-2xl p-4 border text-sm font-bold text-gray-800">{currentListenWord?.meaning}</div>
                <p className="text-gray-600 italic text-xs">"{listenChecked ? currentListenWord?.example : maskedExample}"</p>
                
                {/* HIỂN THỊ Ô INPUT ĐÃ ĐƯỢC LÀM TỐI VÀ ĐẬM CHỮ */}
                <input 
                  type="text" 
                  value={userAnswer} 
                  disabled={listenChecked} 
                  onChange={(e) => setUserAnswer(e.target.value)} 
                  placeholder="Gõ từ tiếng Anh nghe được..." 
                  className={`w-full p-4 border-2 outline-none rounded-xl text-center font-black text-lg transition-all shadow-inner
                    ${!listenChecked ? 'bg-gray-50 text-gray-900 border-gray-200 focus:border-green-400 focus:bg-white focus:shadow-md' : ''}
                    ${listenChecked && listenResult === 'correct' ? 'bg-green-50 text-green-700 border-green-500' : ''}
                    ${listenChecked && listenResult === 'wrong' ? 'bg-red-50 text-red-700 border-red-500' : ''}
                  `} 
                />

                {/* BẢNG BÁO LỖI NẾU HỌC SINH GÕ SAI */}
                {listenChecked && listenResult === 'wrong' && (
                  <div className="w-full mt-2 p-3 bg-red-100 border border-red-200 rounded-xl">
                    <p className="text-xs text-red-600 font-bold mb-1">Đáp án đúng là:</p>
                    <p className="text-lg font-black text-red-800 tracking-wide">{currentListenWord?.word}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 w-full">
                {currentIndex > 0 && (
                  <button onClick={() => goToListen(currentIndex - 1)} className="px-6 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition">← Trở lại</button>
                )}
                <button onClick={() => {
                  if (!listenChecked) handleCheckListenAnswer();
                  else {
                    if (currentIndex < shuffledPool.length - 1) goToListen(currentIndex + 1);
                    else handleFinishSession();
                  }
                }} className="flex-1 bg-green-400 hover:bg-green-500 text-white font-bold text-sm p-4 rounded-xl shadow-md border-none cursor-pointer transition">
                  {!listenChecked ? 'Kiểm tra đáp án ✔' : currentIndex < shuffledPool.length - 1 ? 'Từ tiếp theo →' : 'Hoàn thành bài tập'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );

    case 'quiz':
      if (quizQuestions.length === 0) return null;
      const currentQuestion = quizQuestions[currentIndex];
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={handleExit} className="bg-white/20 rounded-lg p-1.5 px-3 text-white text-xs font-bold">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">📝 Trắc nghiệm — {topic?.title}</span>
          </header>
          
          <div className="flex-1 flex flex-col lg:flex-row p-4 max-w-6xl w-full mx-auto gap-8 items-start justify-center mt-6">
            <div className="w-full lg:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
              <h3 className="font-bold mb-4 uppercase text-sm text-center text-green-500">Bảng câu hỏi</h3>
              <div className="grid grid-cols-5 gap-2">
                {quizQuestions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToQuiz(i)}
                    className={`py-2 rounded-lg font-bold text-sm transition-all ${
                      currentIndex === i 
                        ? 'bg-green-500 text-white shadow-md scale-105' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 max-w-xl w-full flex flex-col justify-center gap-5">
              <div className="w-full bg-white rounded-3xl border shadow-xl p-6 flex flex-col gap-4">
                <h3 className="text-gray-800 font-bold text-base leading-relaxed">"{currentQuestion.maskedSentence}"</h3>
                <p className="text-gray-500 text-xs mt-2 bg-gray-50 p-3 rounded-lg border">Nghĩa gợi ý: <strong className="text-gray-800 font-bold">"{currentQuestion.meaning}"</strong></p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === currentQuestion.correctAnswer;
                  let optStyle = 'bg-white border-gray-200 text-gray-700 hover:border-amber-300';
                  if (!quizChecked && isSelected) optStyle = 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm scale-[1.01]';
                  else if (quizChecked) {
                    if (isCorrect) optStyle = 'bg-green-50 border-green-500 text-green-700 font-bold shadow-md';
                    else if (isSelected && !isCorrect) optStyle = 'bg-red-50 border-red-400 text-red-700';
                    else optStyle = 'bg-white border-gray-100 text-gray-300 opacity-60';
                  }
                  return (
                    <button key={idx} disabled={quizChecked} onClick={() => setSelectedOption(option)} className={`w-full p-4 border-2 rounded-2xl text-left font-semibold text-sm transition-all ${optStyle}`}>{option}</button>
                  );
                })}
              </div>
              
              <div className="flex gap-4 w-full mt-2">
                {currentIndex > 0 && (
                  <button onClick={() => goToQuiz(currentIndex - 1)} className="px-6 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition">← Trở lại</button>
                )}
                <button onClick={() => {
                  if (!quizChecked) handleCheckQuizAnswer();
                  else {
                    if (currentIndex < quizQuestions.length - 1) goToQuiz(currentIndex + 1);
                    else handleFinishSession(quizScore);
                  }
                }} disabled={!selectedOption && !quizChecked} className="flex-1 bg-green-400 hover:bg-green-500 text-white font-bold text-sm p-4 rounded-xl shadow-md border-none cursor-pointer transition disabled:opacity-50">
                  {!quizChecked ? 'Kiểm tra câu trả lời' : currentIndex < quizQuestions.length - 1 ? 'Câu tiếp theo →' : 'Hoàn thành bài tập'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );

    case 'match':
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={handleExit} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer">← Thôi học</button>
            <span className="text-white font-black text-sm text-center flex-1">🔗 Tìm cặp từ vựng — {topic?.title}</span>
          </header>
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col justify-center gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 w-full">
              {matchCards.map((card) => {
                const isSelected = selectedCards.some(c => c.uniqueId === card.uniqueId);
                const isMatched = matchedCards.includes(card.uniqueId);
                const isCorrect = correctCards.includes(card.uniqueId);
                const isWrong = wrongCards.includes(card.uniqueId);
                let cls = 'bg-white border-gray-200 text-gray-700 hover:border-amber-300';
                if (isSelected) cls = 'bg-amber-50 border-amber-400 text-amber-700 shadow';
                if (isCorrect) cls = 'bg-green-50 border-green-500 text-green-700 shadow-md';
                if (isWrong) cls = 'bg-red-50 border-red-500 text-red-700';
                return (
                  <div key={card.uniqueId} onClick={() => handleCardClick(card)} className={`h-24 rounded-2xl p-3 flex items-center justify-center text-center font-bold text-xs border cursor-pointer select-none transition-all duration-200 ${isMatched ? 'opacity-0 scale-90 pointer-events-none' : ''} ${cls}`}><span className="line-clamp-3 leading-relaxed">{card.content}</span></div>
                );
              })}
            </div>
          </div>
        </div>
      );

    case 'typer':
      if (shuffledPool.length === 0) return null;
      const currentTyperWord = shuffledPool[currentIndex];
      const maskedTyperSentence = currentTyperWord?.example.replace(new RegExp(`\\b${currentTyperWord?.word}\\b`, 'gi'), '_____');

      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={handleExit} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer">← Bỏ cuộc</button>
            <span className="text-white font-black text-sm text-center flex-1">⚡ Đua tốc độ phản xạ — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-emerald-600 px-3 py-1.5 rounded-full">Từ: {currentIndex + 1}/{shuffledPool.length}</span>
          </header>

          <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center gap-6">
            <div className="flex items-center justify-between bg-white border border-gray-100 p-4 px-6 rounded-2xl shadow-sm w-full">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Thời gian phản xạ</span>
                  <span className={`text-xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>{timeLeft} giây</span>
                </div>
              </div>
              <div className="w-[1px] h-8 bg-gray-100" />
              <div className="flex items-center gap-2">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Từ gõ đúng</span>
                  <span className="text-xl font-black text-green-500">{typerScore} / {shuffledPool.length}</span>
                </div>
                <span className="text-xl">🏆</span>
              </div>
            </div>

            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden shadow-inner">
              <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${(timeLeft / 15) * 100}%` }} />
            </div>

            <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col items-center gap-4 text-center">
              <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">Recall & Spelling Match</span>
              <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 my-1">
                <p className="text-gray-800 font-black text-lg leading-snug">{currentTyperWord?.meaning}</p>
                <p className="text-gray-400 font-mono text-xs font-bold mt-1.5 bg-white inline-block px-3 py-0.5 rounded-full border border-gray-100">Độ dài: {currentTyperWord?.word.length} chữ cái | {currentTyperWord?.ipa}</p>
              </div>
              <div className="w-full bg-emerald-50/30 rounded-2xl p-4 border text-left"><p className="text-gray-600 italic text-xs">"{maskedTyperSentence}"</p></div>
              <input type="text" autoFocus value={typerInput} onChange={handleTyperInputChange} placeholder="Gõ thật nhanh từ tiếng Anh..." className="w-full p-4 border rounded-2xl text-center font-black text-base tracking-wide bg-white focus:outline-none" />
            </div>
            <button onClick={handleNextTyperWord} className="w-full bg-gray-200 text-gray-500 font-bold text-xs p-3.5 rounded-xl border-none">Bỏ qua ➔</button>
          </div>
        </div>
      );

    case 'invaders':
      if (shuffledPool.length === 0) return null;
      const currentActiveTarget = shuffledPool[currentIndex];
      const maskedArcadeSentence = currentActiveTarget?.example.replace(new RegExp(`\\b${currentActiveTarget?.word}\\b`, 'gi'), '_____');

      return (
        <div className={`${roboto.className} min-h-screen bg-slate-950 flex flex-col antialiased text-white select-none`}>
          <header className="bg-slate-900 p-3.5 px-5 flex items-center justify-between border-b border-slate-800 shadow-xl">
            <button onClick={handleExit} className="bg-white/10 rounded-lg p-1.5 px-3 text-gray-300 text-xs font-bold border-none cursor-pointer">🛬 Rút lui</button>
            <span className="text-green-400 font-black text-sm tracking-widest uppercase">🛡️ Hệ thống phòng thủ: {topic?.title}</span>
            <span className="text-gray-400 text-xs font-mono">Khối: {currentIndex + 1}/{shuffledPool.length}</span>
          </header>

          <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 px-6 rounded-2xl shadow-inner w-full">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400 uppercase">Năng lượng khiên (HP)</span>
                <div className="flex gap-1.5 text-lg">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={`transition-all duration-300 ${i < gameHealth ? 'text-red-500 scale-110 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]' : 'text-slate-700 opacity-20 scale-90'}`}>❤️</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col text-right gap-0.5">
                <span className="text-[10px] font-black text-gray-400 uppercase">Thiệt hại đã phá hủy</span>
                <span className="text-xl font-black text-green-400 font-mono tracking-wider">{gameScore} / {shuffledPool.length}</span>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-900/60 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden min-h-[360px] flex flex-col justify-between p-6">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-10 pointer-events-none" />

              <div className="absolute left-0 right-0 mx-auto w-11/12 max-w-md transition-all duration-100 ease-linear flex flex-col items-center" style={{ top: `${wordYPos}%` }}>
                <div className={`w-full p-4 rounded-2xl border flex flex-col items-center justify-center text-center shadow-lg transition-transform duration-150 ${laserEffect ? 'bg-green-500/30 border-green-400 scale-90 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]' : 'bg-slate-900/90 border-amber-500/70'}`}>
                  <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider mb-2">Chướng ngại vật</span>
                  <p className="text-white font-black text-base md:text-lg leading-snug tracking-wide">{currentActiveTarget?.meaning}</p>
                  <p className="text-gray-400 font-mono text-[10px] mt-1.5">Gợi ý: {currentActiveTarget?.word.length} chữ cái | {currentActiveTarget?.ipa}</p>
                </div>
                <div className="w-2 h-6 bg-gradient-to-b from-amber-500 to-transparent opacity-60 animate-pulse mt-0.5" />
              </div>

              {laserEffect && <div className="absolute left-0 right-0 mx-auto w-1 bg-gradient-to-t from-green-400 to-white animate-pulse" style={{ top: 0, bottom: '15%', zIndex: 10 }} />}
              <div className="absolute bottom-[12%] left-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-70 animate-pulse" />

              <div className="mt-auto w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 z-20">
                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Cấu trúc câu TOEIC mục tiêu</span>
                <p className="text-gray-400 italic text-xs leading-relaxed font-medium">"{maskedArcadeSentence}"</p>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2 bg-slate-900 p-4 border border-slate-800 rounded-2xl shadow-xl">
              <input type="text" autoFocus value={gameInput} disabled={isGameOver} onChange={handleInvadersInputChange} placeholder="Nhìn nghĩa rơi, gõ từ Tiếng Anh chuẩn để kích nổ..." className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-center font-black text-green-400 text-lg tracking-wider focus:outline-none placeholder-slate-700" />
            </div>
          </div>
        </div>
      );

    case 'learn':
    default:
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={handleExit} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">📚 Học từ vựng — {topic?.title}</span>
          </header>

          <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 mt-4 flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-xl">
              <div className="text-center mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-black text-green-600 mb-2">Danh Sách Từ Vựng Cốt Lõi</h2>
                <p className="text-gray-500 text-sm font-medium">Hãy đọc thật kỹ từ vựng, cách phát âm, và ví dụ trước khi tham gia các trò chơi.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {words.map((item, idx) => (
                  <div key={idx} className="p-4 border-2 border-gray-50 rounded-2xl bg-gray-50/50 hover:bg-white hover:border-green-300 hover:shadow-md transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-lg text-gray-800">{item.word}</span>
                        <span className="text-xs font-mono text-gray-400 font-bold bg-white px-2 py-0.5 rounded border shadow-sm">{item.ipa}</span>
                      </div>
                      <button 
                        onClick={() => playAudio(item.word, 'word')} 
                        className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                      >
                        🔊
                      </button>
                    </div>
                    <p className="font-bold text-green-600 text-sm">{item.meaning}</p>
                    <p className="text-gray-500 italic text-xs leading-relaxed mt-1">"{item.example}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center pb-10">
              <button 
                onClick={() => handleFinishSession(words.length)} 
                className="w-full md:w-auto md:min-w-[300px] bg-gray-900 hover:bg-black text-white font-black text-sm p-4 rounded-xl shadow-lg transition-all"
              >
                Đã học xong & Lưu tiến trình
              </button>
            </div>
          </div>
        </div>
      );
  }
}

export default function VocabularyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-xs font-bold">Đang nạp tiến trình học từ vựng...</div>}>
      <VocabularyContent />
    </Suspense>
  );
}