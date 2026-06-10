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

  const topic = VOCAB_TOPICS.find(t => String(t.id) === String(topicId));

  // States dữ liệu tổng hệ thống
  const [shuffledPool, setShuffledPool] = useState([]); 
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States chế độ Flashcards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false); 

  // States chế độ Tìm Cặp (Matching)
  const [currentRound, setCurrentRound] = useState(1); 
  const [matchCards, setMatchCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [wrongCards, setWrongCards] = useState([]); 
  const [correctCards, setCorrectCards] = useState([]); 
  const [isChecking, setIsChecking] = useState(false);

  // States chế độ Nghe từ vựng
  const [listenIndex, setListenIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [listenChecked, setListenChecked] = useState(false);
  const [listenResult, setListenResult] = useState(null); 
  const [voiceAccent, setVoiceAccent] = useState('en-US'); 

  // States chế độ Trắc nghiệm từ vựng (50 câu ngẫu nhiên)
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // ⚡ States chế độ ĐUA TỐC ĐỘ PHẢN XẠ 
  const [typerIndex, setTyperIndex] = useState(0);
  const [typerInput, setTyperInput] = useState('');
  const [typerScore, setTyperScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15); 
  const [isTyperFinished, setIsTyperFinished] = useState(false);

  // 🚀 States chế độ VƯỢT CHƯỚNG NGẠI VẬT (SPACE INVADERS)
  const [gameIndex, setGameIndex] = useState(0);
  const [gameInput, setGameInput] = useState('');
  const [gameScore, setGameScore] = useState(0);
  const [gameHealth, setGameHealth] = useState(3); 
  const [wordYPos, setWordYPos] = useState(0); 
  const [isGameOver, setIsGameOver] = useState(false);
  const [laserEffect, setLaserEffect] = useState(false);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  // Các biến tham chiếu động phá vỡ Closer Scope Stale State trong setInterval
  const gameLoopRef = useRef(null);
  const gameIndexRef = useRef(gameIndex);
  const shuffledPoolRef = useRef(shuffledPool);

  // Cập nhật tham chiếu đồng bộ mọi lượt render
  useEffect(() => {
    gameIndexRef.current = gameIndex;
  }, [gameIndex]);

  useEffect(() => {
    shuffledPoolRef.current = shuffledPool;
  }, [shuffledPool]);

  // ĐỒNG BỘ DỮ LIỆU BAN ĐẦU
  useEffect(() => {
    if (!topicId) return;

    async function fetchAndParseExcelData() {
      try {
        setLoading(true);
        setError(null);
        setIsFlipped(false);
        setCurrentIndex(0);
        setListenIndex(0);
        setUserAnswer('');
        setListenChecked(false);
        setListenResult(null);
        
        setQuizIndex(0);
        setSelectedOption(null);
        setQuizChecked(false);
        setQuizScore(0);

        setTyperIndex(0);
        setTyperInput('');
        setTyperScore(0);
        setTimeLeft(15);
        setIsTyperFinished(false);

        setGameIndex(0);
        setGameInput('');
        setGameScore(0);
        setGameHealth(3);
        setWordYPos(0);
        setIsGameOver(false);
        setLaserEffect(false);

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

        // Khởi tạo đợt 1 cho Tìm cặp
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

        // Khởi tạo 50 câu trắc nghiệm ngẫu nhiên
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
  }, [topicId, mode]);

  // ⚡ TIMER COUNTDOWN ĐỐI VỚI CHẾ ĐỘ ĐUA TỐC ĐỘ PHẢN XẠ
  useEffect(() => {
    if (mode !== 'typer' || isTyperFinished || loading || shuffledPool.length === 0) return;

    if (timeLeft === 0) {
      handleNextTyperWord();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, mode, isTyperFinished, loading, shuffledPool]);

  // 🚀 ARCADE PHYSICS TICK ENGINE - SỬA LỖI TRỪ MÁU VÀ GIẢM TỐC ĐỘ RƠI (+4S)
  useEffect(() => {
    if (mode !== 'invaders' || isGameOver || loading || shuffledPool.length === 0) return;

    // Giảm tốc độ rơi cơ bản từ 1.2 xuống 0.5 để khối từ vựng trôi chậm hơn thêm 4 giây
    const speedFactor = 0.5 + (gameScore * 0.05); 

    gameLoopRef.current = setInterval(() => {
      setWordYPos((prevY) => {
        if (prevY >= 82) { 
          // Gọi hàm crash sử dụng Functional State chặn Stale Closure
          handleWordCrash();
          return 0;
        }
        return prevY + speedFactor;
      });
    }, 160); // Tăng thời gian tick giúp ảnh chuyển động trôi êm ái hơn

    return () => clearInterval(gameLoopRef.current);
  }, [mode, isGameOver, loading, shuffledPool, gameIndex, gameScore]);

  const handleWordCrash = () => {
    // Ép trừ máu dạng Functional State chạy tức thì
    setGameHealth((prevHealth) => {
      const nextHealth = prevHealth - 1;
      if (nextHealth <= 0) {
        setIsGameOver(true);
        clearInterval(gameLoopRef.current);
        // Trễ nhẹ để học viên kịp thấy tim cuối cùng biến mất
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
    const poolLength = shuffledPoolRef.current.length;

    if (currentIndexVal < poolLength - 1) {
      setGameIndex((prev) => prev + 1);
    } else {
      setIsGameOver(true);
      clearInterval(gameLoopRef.current);
      handleFinishSession(gameScore);
    }
  };

  const handleInvadersInputChange = (e) => {
    const val = e.target.value;
    setGameInput(val);
    const target = shuffledPool[gameIndex]?.word.toLowerCase().trim();
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

  // PHÁT ÂM THANH TEXT-TO-SPEECH
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
      router.push('/home');
      return;
    }
    const scoreToSave = finalScore !== null ? finalScore : words.length;
    const totalToSave = shuffledPool.length;
    
    try {
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `vocab_${mode}_${topicId}`), {
        status: 'completed',
        score: scoreToSave,
        totalQuestions: totalToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert(`🎉 Kết thúc màn chơi! Điểm số phòng thủ thành phố: ${scoreToSave}/${totalToSave}`);
      router.push('/home');
    } catch (err) {
      router.push('/home');
    }
  };

  // LOGIC ĐÁP ÁN NGHE
  const handleCheckListenAnswer = () => {
    if (!userAnswer.trim()) return;
    const correctAnswer = shuffledPool[listenIndex]?.word.toLowerCase().trim();
    setListenChecked(true);
    setListenResult(userAnswer.toLowerCase().trim() === correctAnswer ? 'correct' : 'wrong');
  };

  const handleNextListenCard = () => {
    setUserAnswer('');
    setListenChecked(false);
    setListenResult(null);
    if (listenIndex < shuffledPool.length - 1) setListenIndex(p => p + 1);
    else handleFinishSession();
  };

  // LOGIC TRẮC NGHIỆM
  const handleCheckQuizAnswer = () => {
    if (!selectedOption || quizChecked) return;
    setQuizChecked(true);
    if (selectedOption === quizQuestions[quizIndex].correctAnswer) setQuizScore(p => p + 1);
  };

  const handleNextQuizQuestion = () => {
    const isLast = quizIndex === quizQuestions.length - 1;
    const finalCalc = quizScore + (selectedOption === quizQuestions[quizIndex].correctAnswer ? 1 : 0);
    setSelectedOption(null);
    setQuizChecked(false);
    if (!isLast) setQuizIndex(p => p + 1);
    else handleFinishSession(finalCalc);
  };

  // LOGIC ĐUA PHẢN XẠ GÕ CHỮ
  const handleTyperInputChange = (e) => {
    const val = e.target.value;
    setTyperInput(val);
    const target = shuffledPool[typerIndex]?.word.toLowerCase().trim();
    if (val.toLowerCase().trim() === target) {
      setTyperScore(p => p + 1);
      handleNextTyperWord();
    }
  };

  const handleNextTyperWord = () => {
    setTyperInput('');
    setTimeLeft(15);
    if (typerIndex < shuffledPool.length - 1) setTyperIndex(p => p + 1);
    else handleFinishSession(typerScore + 1);
  };

  // LOGIC TÌM CẶP
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

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < words.length - 1) setCurrentIndex(p => p + 1);
      else handleFinishSession();
    }, 200); 
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-xs font-bold gap-3"><div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />Đang nạp dữ liệu từ vựng...</div>;

  switch (mode) {
    case 'flashcard':
      const currentCard = words[currentIndex];
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">🃏 Flashcards — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{currentIndex + 1}/{words.length}</span>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl w-full mx-auto gap-8">
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
            <div className="flex items-center justify-between w-full px-2 gap-4">
              <button onClick={() => { setIsFlipped(false); setCurrentIndex(p => p - 1); }} disabled={currentIndex === 0} className="flex-1 bg-white border text-gray-600 font-bold text-xs p-3.5 rounded-xl disabled:opacity-40 shadow-sm">← Từ trước</button>
              <button onClick={handleNextCard} className="flex-1 bg-green-400 text-white font-bold text-xs p-3.5 rounded-xl shadow-md">Từ tiếp theo →</button>
            </div>
          </div>
        </div>
      );

    case 'match':
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer">← Thôi học</button>
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

    case 'listen':
      const currentListenWord = shuffledPool[listenIndex];
      const maskedExample = currentListenWord?.example.replace(new RegExp(`\\b${currentListenWord?.word}\\b`, 'gi'), '[...]');
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md"><button onClick={() => router.back()} className="bg-white/20 rounded-lg p-1.5 px-3 text-white text-xs font-bold">← Thoát</button><span className="text-white font-black text-sm text-center flex-1">🎧 Luyện nghe — {topic?.title}</span></header>
          <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center items-center gap-6">
            <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col items-center gap-6 text-center">
              <button onClick={() => playAudio(currentListenWord?.word, 'word')} className="w-20 h-20 bg-green-50 text-green-500 hover:bg-green-100 rounded-full flex items-center justify-center text-3xl border-none cursor-pointer">🔊</button>
              <div className="w-full bg-gray-50 rounded-2xl p-4 border text-sm font-bold text-gray-800">{currentListenWord?.meaning}</div>
              <p className="text-gray-600 italic text-xs">"{listenChecked ? currentListenWord?.example : maskedExample}"</p>
              <input type="text" value={userAnswer} disabled={listenChecked} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Gõ từ tiếng Anh nghe được..." className="w-full p-3.5 border rounded-xl text-center font-bold text-sm" />
            </div>
            <button onClick={!listenChecked ? handleCheckListenAnswer : handleNextListenCard} className="w-full bg-green-400 text-white font-bold text-xs p-3.5 rounded-xl shadow-md border-none cursor-pointer">{!listenChecked ? 'Kiểm tra đáp án ✔' : 'Từ tiếp theo →'}</button>
          </div>
        </div>
      );

    case 'quiz':
      if (quizQuestions.length === 0) return null;
      const currentQuestion = quizQuestions[quizIndex];
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md"><button onClick={() => router.back()} className="bg-white/20 rounded-lg p-1.5 px-3 text-white text-xs font-bold">← Thoát</button><span className="text-white font-black text-sm text-center flex-1">📝 Trắc nghiệm — {topic?.title}</span></header>
          <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center gap-5">
            <div className="w-full bg-white rounded-3xl border shadow-xl p-6 flex flex-col gap-4">
              <h3 className="text-gray-800 font-bold text-base">"{currentQuestion.maskedSentence}"</h3>
              <p className="text-gray-400 text-xs">Nghĩa gợi ý: <strong className="text-gray-700 font-bold">"{currentQuestion.meaning}"</strong></p>
            </div>
            <div className="flex flex-col gap-2.5 w-full">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                let optStyle = 'bg-white border-gray-200 text-gray-700';
                if (!quizChecked && isSelected) optStyle = 'bg-amber-50 border-amber-400 text-amber-800';
                else if (quizChecked) {
                  if (isCorrect) optStyle = 'bg-green-50 border-green-500 text-green-700 font-bold';
                  else if (isSelected && !isCorrect) optStyle = 'bg-red-50 border-red-400 text-red-700';
                  else optStyle = 'bg-white border-gray-100 text-gray-300 opacity-60';
                }
                return (
                  <button key={idx} disabled={quizChecked} onClick={() => setSelectedOption(option)} className={`w-full p-4 border rounded-2xl text-left font-semibold text-sm flex items-center gap-3 ${optStyle}`}>{option}</button>
                );
              })}
            </div>
            <button onClick={!quizChecked ? handleCheckQuizAnswer : handleNextQuizQuestion} disabled={!selectedOption} className="w-full bg-green-400 text-white font-bold text-xs p-4 rounded-xl border-none cursor-pointer">{!quizChecked ? 'Kiểm tra câu trả lời' : 'Câu tiếp theo →'}</button>
          </div>
        </div>
      );

    case 'typer':
      if (shuffledPool.length === 0) return null;
      const currentTyperWord = shuffledPool[typerIndex];
      const maskedTyperSentence = currentTyperWord?.example.replace(new RegExp(`\\b${currentTyperWord?.word}\\b`, 'gi'), '_____');

      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer">← Bỏ cuộc</button>
            <span className="text-white font-black text-sm text-center flex-1">⚡ Đua tốc độ phản xạ — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-emerald-600 px-3 py-1.5 rounded-full">Từ: {typerIndex + 1}/{shuffledPool.length}</span>
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
      const currentActiveTarget = shuffledPool[gameIndex];
      const maskedArcadeSentence = currentActiveTarget?.example.replace(new RegExp(`\\b${currentActiveTarget?.word}\\b`, 'gi'), '_____');

      return (
        <div className={`${roboto.className} min-h-screen bg-slate-950 flex flex-col antialiased text-white select-none`}>
          <header className="bg-slate-900 p-3.5 px-5 flex items-center justify-between border-b border-slate-800 shadow-xl">
            <button onClick={() => router.back()} className="bg-white/10 rounded-lg p-1.5 px-3 text-gray-300 text-xs font-bold border-none cursor-pointer">🛬 Rút lui</button>
            <span className="text-green-400 font-black text-sm tracking-widest uppercase">🛡️ Hệ thống phòng thủ: {topic?.title}</span>
            <span className="text-gray-400 text-xs font-mono">Khối: {gameIndex + 1}/{shuffledPool.length}</span>
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

              {/* KHỐI CHỮ RƠI TỰ DO ĐỘNG */}
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
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col p-6`}>
          <div className="max-w-2xl w-full mx-auto bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mt-10">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📚 Chế độ: Học từ vựng</h2>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {words.map((item, idx) => (
                <div key={idx} className="p-4 flex flex-col gap-1 text-sm">
                  <span className="font-bold text-green-500">{item.word}</span>
                  <p className="text-gray-700 text-xs">Nghĩa: {item.meaning}</p>
                </div>
              ))}
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