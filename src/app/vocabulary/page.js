'use client';

import { Suspense, useState, useEffect } from 'react';
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

  // States tổng
  const [shuffledPool, setShuffledPool] = useState([]); 
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States Flashcards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false); 

  // States Game Tìm Cặp
  const [currentRound, setCurrentRound] = useState(1); 
  const [matchCards, setMatchCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [wrongCards, setWrongCards] = useState([]); 
  const [correctCards, setCorrectCards] = useState([]); 
  const [isChecking, setIsChecking] = useState(false);

  // States Nghe từ vựng
  const [listenIndex, setListenIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [listenChecked, setListenChecked] = useState(false);
  const [listenResult, setListenResult] = useState(null); 
  const [voiceAccent, setVoiceAccent] = useState('en-US'); 

  // States Trắc nghiệm từ vựng
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // 🌟 States MINI-GAME ĐUA TỐC ĐỘ GÕ TỪ (MỚI)
  const [typerIndex, setTyperIndex] = useState(0);
  const [typerInput, setTyperInput] = useState('');
  const [typerScore, setTyperScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15); // 15 giây cho mỗi từ
  const [isTyperFinished, setIsTyperFinished] = useState(false);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // FETCH VÀ KHỞI TẠO DỮ LIỆU
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

        // Reset Typer Game States
        setTyperIndex(0);
        setTyperInput('');
        setTyperScore(0);
        setTimeLeft(15);
        setIsTyperFinished(false);

        const docSnap = await getDoc(doc(db, 'vocab_lessons', String(topicId)));
        if (!docSnap.exists()) {
          throw new Error('Chưa cấu hình liên kết dữ liệu vocabUrl cho chủ đề này trên Firestore.');
        }

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
        if (!response.ok) throw new Error('Không thể đọc dữ liệu file Drive. Kiểm tra lại quyền công khai.');

        const csvText = await response.text();
        const parsedData = parseCSVToJSON(csvText);
        
        if (parsedData.length === 0) throw new Error('File tài liệu trống hoặc sai quy cách đặt tiêu đề cột.');

        setWords(parsedData);

        const randomizedPool = shuffleArray([...parsedData]);
        setShuffledPool(randomizedPool);

        // KHỞI TẠO ĐỢT 1 CHO TÌM CẶP
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

        // KHỞI TẠO TRẮC NGHIỆM 50 CÂU
        if (mode === 'quiz') {
          const generatedQuestions = randomizedPool.map((item) => {
            const distractors = parsedData
              .filter(w => w.word !== item.word)
              .map(w => w.word);
            const randomDistractors = shuffleArray(distractors).slice(0, 3);
            const options = shuffleArray([item.word, ...randomDistractors]);
            
            return {
              questionWord: item.word,
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

  // 🌟 HIỆU ỨNG ĐẾM NGƯỢC THỜI GIAN CHO MINI-GAME GÕ CHỮ (WORD TYPER)
  useEffect(() => {
    if (mode !== 'typer' || isTyperFinished || loading || shuffledPool.length === 0) return;

    if (timeLeft === 0) {
      // Hết giờ câu này: Tự động chuyển sang từ tiếp theo
      handleNextTyperWord();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, mode, isTyperFinished, loading, shuffledPool]);

  // LUỒNG SOUND CHO NGHE TỪ VỰNG
  const playAudio = (text, type = 'word') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceAccent;
    utterance.rate = type === 'word' ? 0.9 : 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const generateRoundCards = (pool, roundNumber) => {
    const itemsPerRound = 10;
    const startIndex = (roundNumber - 1) * itemsPerRound;
    const endIndex = startIndex + itemsPerRound;
    const roundWords = pool.slice(startIndex, endIndex);
    
    let generatedCards = [];
    roundWords.forEach((item, index) => {
      generatedCards.push({ uniqueId: `w_${roundNumber}_${index}`, pairId: index, content: item.word, type: 'word' });
      generatedCards.push({ uniqueId: `m_${roundNumber}_${index}`, pairId: index, content: item.meaning, type: 'meaning' });
    });
    
    setSelectedCards([]);
    setMatchedCards([]);
    setWrongCards([]);
    setCorrectCards([]);
    setMatchCards(shuffleArray(generatedCards));
  };

  // ĐỒNG BỘ TIẾN TRÌNH LÊN FIREBASE KHI KẾT THÚC
  const handleFinishSession = async (finalScore = null) => {
    if (!CURRENT_USER_ID) {
      router.push('/home');
      return;
    }
    const scoreToSave = finalScore !== null ? finalScore : (mode === 'match' ? 50 : words.length);
    const totalToSave = mode === 'quiz' || mode === 'typer' ? shuffledPool.length : words.length;
    
    try {
      const progressRef = doc(db, 'users', CURRENT_USER_ID, 'progress', `vocab_${mode}_${topicId}`);
      await setDoc(progressRef, {
        status: 'completed',
        score: scoreToSave,
        totalQuestions: totalToSave,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert(`🎉 Hoàn thành xuất sắc bài học! Điểm số tổng của bạn: ${scoreToSave}/${totalToSave}`);
      router.push('/home');
    } catch (err) {
      console.error(err);
      router.push('/home');
    }
  };

  // LOGIC ĐÁP ÁN PHẦN NGHE TỪ VỰNG
  const handleCheckListenAnswer = () => {
    if (!userAnswer.trim()) return;
    const correctAnswer = shuffledPool[listenIndex]?.word.toLowerCase().trim();
    const currentInput = userAnswer.toLowerCase().trim();
    setListenChecked(true);
    setListenResult(currentInput === correctAnswer ? 'correct' : 'wrong');
  };

  const handleNextListenCard = () => {
    setUserAnswer('');
    setListenChecked(false);
    setListenResult(null);
    if (listenIndex < shuffledPool.length - 1) {
      setListenIndex(prev => prev + 1);
    } else {
      handleFinishSession();
    }
  };

  // LOGIC KIỂM TRA ĐÁP ÁN TRẮC NGHIỆM 50 CÂU
  const handleCheckQuizAnswer = () => {
    if (!selectedOption || quizChecked) return;
    setQuizChecked(true);
    if (selectedOption === quizQuestions[quizIndex].correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    const isLastQuestion = quizIndex === quizQuestions.length - 1;
    const finalCalculatedScore = quizScore + (selectedOption === quizQuestions[quizIndex].correctAnswer ? 1 : 0);
    setSelectedOption(null);
    setQuizChecked(false);
    if (!isLastQuestion) {
      setQuizIndex(prev => prev + 1);
    } else {
      handleFinishSession(finalCalculatedScore);
    }
  };

  // 🌟 LOGIC TỰ ĐỘNG CHUYỂN TỪ HOẶC CHECK ĐÁP ÁN KHI USER GÕ PHẦN MINI-GAME (TYPER)
  const handleTyperInputChange = (e) => {
    const val = e.target.value;
    setTyperInput(val);

    const targetWord = shuffledPool[typerIndex]?.word.toLowerCase().trim();
    if (val.toLowerCase().trim() === targetWord) {
      setTyperScore(prev => prev + 1);
      handleNextTyperWord();
    }
  };

  const handleNextTyperWord = () => {
    setTyperInput('');
    setTimeLeft(15); // Reset lại 15 giây cho từ mới
    
    if (typerIndex < shuffledPool.length - 1) {
      setTyperIndex(prev => prev + 1);
    } else {
      setIsTyperFinished(true);
      // Kết thúc game, truyền điểm số nộp Firebase
      handleFinishSession(typerScore + 1); 
    }
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
              const maxRounds = Math.ceil(shuffledPool.length / 10);
              setTimeout(() => {
                if (nextRound <= maxRounds && (nextRound - 1) * 10 < shuffledPool.length) {
                  setCurrentRound(nextRound);
                  generateRoundCards(shuffledPool, nextRound);
                } else {
                  handleFinishSession();
                }
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
        setTimeout(() => {
          setSelectedCards([]);
          setWrongCards([]);
          setIsChecking(false);
        }, 800);
      }
    }
  };

  // LOGIC FLASHCARDS
  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        handleFinishSession();
      }
    }, 200); 
  };

  const handlePrevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 200);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-xs font-bold gap-3">
        <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        Hệ thống đang kết nối dữ liệu tệp Excel bài học...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-gray-800 font-bold text-sm">Lỗi đồng bộ dữ liệu</h3>
        <p className="text-gray-400 text-xs max-w-md mt-1 mb-4 leading-relaxed">{error}</p>
        <button onClick={() => router.back()} className="bg-green-400 text-white font-bold text-xs p-2 px-5 rounded-xl">Quay lại danh mục</button>
      </div>
    );
  }

  switch (mode) {
    case 'flashcard':
      const currentCard = words[currentIndex];
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">🃏 Flashcards — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{currentIndex + 1}/{words.length}</span>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl w-full mx-auto gap-8">
            <div onClick={() => setIsFlipped(!isFlipped)} className="w-full h-80 cursor-pointer [perspective:1000px] select-none">
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-white border border-gray-100 shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
                  <span className="text-xs font-bold text-green-400 tracking-widest uppercase mb-2">English Word</span>
                  <h2 className="text-4xl font-black text-gray-800 tracking-tight">{currentCard?.word}</h2>
                  <p className="text-sm font-semibold text-gray-400 mt-2 bg-gray-50 px-3 py-1 rounded-full">{currentCard?.ipa}</p>
                  <p className="text-[11px] font-medium text-gray-300 mt-10 animate-pulse">💡 Click vào thẻ để lật xem nghĩa và câu ví dụ</p>
                </div>
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-emerald-500 text-white shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="text-xs font-bold text-emerald-100 tracking-widest uppercase mb-1">Vietnamese Meaning</span>
                  <h3 className="text-2xl font-bold px-2 leading-snug">{currentCard?.meaning}</h3>
                  <div className="w-full h-[1px] bg-white/20 my-5" />
                  <span className="text-[10px] font-bold text-emerald-100 tracking-widest uppercase mb-1">Context Example</span>
                  <p className="text-xs font-medium max-w-sm italic leading-relaxed text-emerald-50 px-2">"{currentCard?.example}"</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between w-full px-2 gap-4">
              <button onClick={handlePrevCard} disabled={currentIndex === 0} className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold text-xs p-3.5 rounded-xl transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">← Từ trước đó</button>
              <button onClick={handleNextCard} className="flex-1 bg-green-400 shadow-md shadow-green-400/20 text-white font-bold text-xs p-3.5 rounded-xl transition hover:opacity-95">
                {currentIndex === words.length - 1 ? 'Hoàn thành bài học 🎉' : 'Từ tiếp theo →'}
              </button>
            </div>
          </div>
        </div>
      );

    case 'match':
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thôi học</button>
            <span className="text-white font-black text-sm text-center flex-1">🔗 Tìm cặp từ vựng — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-emerald-600 px-3 py-1.5 rounded-full">Hiệp: {currentRound} / {Math.ceil(shuffledPool.length / 10)}</span>
          </header>

          <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-white p-3 px-5 rounded-2xl border border-gray-100 shadow-sm text-center sm:text-left">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">🎯 Đợt này gồm 10 từ ngẫu nhiên (20 ô chữ)</span>
              <span className="text-xs font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full">Đã giải quyết: {((currentRound - 1) * 10) + (matchedCards.length / 2)} / {shuffledPool.length} từ</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 w-full mt-2">
              {matchCards.map((card) => {
                const isSelected = selectedCards.some(c => c.uniqueId === card.uniqueId);
                const isMatched = matchedCards.includes(card.uniqueId);
                const isCorrectPair = correctCards.includes(card.uniqueId);
                const isWrongPair = wrongCards.includes(card.uniqueId);

                let cardStyleClass = 'bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:shadow-md';
                if (isSelected) cardStyleClass = 'bg-amber-50 border-amber-400 text-amber-700 scale-102 shadow';
                if (isCorrectPair) cardStyleClass = 'bg-green-50 border-green-500 text-green-700 scale-102 shadow-md';
                if (isWrongPair) cardStyleClass = 'bg-red-50 border-red-500 text-red-700';

                return (
                  <div
                    key={card.uniqueId}
                    onClick={() => handleCardClick(card)}
                    className={`h-24 rounded-2xl p-3 flex items-center justify-center text-center font-bold text-xs border cursor-pointer select-none transition-all duration-200
                      ${isMatched ? 'opacity-0 scale-90 pointer-events-none' : ''} ${cardStyleClass}`}
                  >
                    <span className="line-clamp-3 leading-relaxed font-semibold">{card.content}</span>
                  </div>
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
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">🎧 Luyện nghe từ vựng — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-emerald-600 px-3 py-1 rounded-full">Tiến độ: {listenIndex + 1}/{shuffledPool.length}</span>
          </header>

          <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center items-center gap-6">
            <div className="flex items-center gap-2 bg-white p-1.5 px-3 rounded-full border border-gray-100 shadow-sm text-xs font-bold text-gray-500">
              <span>Giọng phát âm:</span>
              <button onClick={() => setVoiceAccent('en-US')} className={`border-none rounded-full px-2.5 py-1 font-black cursor-pointer transition ${voiceAccent === 'en-US' ? 'bg-green-400 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>US (Mỹ)</button>
              <button onClick={() => setVoiceAccent('en-GB')} className={`border-none rounded-full px-2.5 py-1 font-black cursor-pointer transition ${voiceAccent === 'en-GB' ? 'bg-green-400 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>UK (Anh)</button>
            </div>

            <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col items-center gap-6 text-center">
              <button onClick={() => playAudio(currentListenWord?.word, 'word')} className="w-20 h-20 bg-green-50 text-green-500 hover:bg-green-100 rounded-full flex items-center justify-center text-3xl border-none cursor-pointer transition shadow-inner">🔊</button>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-300 tracking-widest uppercase">Audio Dictation Challenge</span>
                <p className="text-gray-400 text-xs font-medium px-4 leading-relaxed">Nghe phát âm, xem nghĩa gợi ý và điền chính xác từ vựng tiếng Anh vào ô trống.</p>
              </div>

              <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <span className="text-[9px] font-black text-green-400 tracking-wider uppercase block mb-1">Gợi ý nghĩa tiếng Việt</span>
                <p className="text-gray-800 font-bold text-sm leading-snug">{currentListenWord?.meaning}</p>
                {listenChecked && <p className="text-gray-400 text-xs font-mono font-bold mt-1 bg-white inline-block px-3 py-0.5 rounded-full border border-gray-100">{currentListenWord?.ipa}</p>}
              </div>

              <div className="w-full bg-emerald-50/40 rounded-2xl p-4 border border-emerald-100/60 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-emerald-600 tracking-wider uppercase">Nghe cụm từ trong câu</span>
                  <button onClick={() => playAudio(currentListenWord?.example, 'sentence')} className="bg-emerald-500 border-none rounded-lg text-white font-bold text-[10px] p-1 px-2.5 cursor-pointer shadow-sm">🔊 Nghe cả câu</button>
                </div>
                <p className="text-gray-600 italic text-xs leading-relaxed font-medium">"{listenChecked ? currentListenWord?.example : maskedExample}"</p>
              </div>

              <div className="w-full flex flex-col gap-2 mt-2">
                <input 
                  type="text"
                  value={userAnswer}
                  disabled={listenChecked}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Gõ từ vựng tiếng Anh nghe được tại đây..."
                  className={`w-full p-3.5 border rounded-xl text-center font-bold text-sm transition focus:outline-none focus:ring-2
                    ${listenChecked ? (listenResult === 'correct' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700') : 'bg-white border-gray-200 focus:border-green-400 focus:ring-green-100'}`}
                />
                {listenChecked && (
                  <div className={`p-3 rounded-xl text-xs font-bold border ${listenResult === 'correct' ? 'bg-green-100/50 border-green-200 text-green-800' : 'bg-red-100/50 border-red-200 text-red-800'}`}>
                    {listenResult === 'correct' ? '🎉 Chính xác!' : `❌ Chưa đúng! Đáp án chuẩn: "${currentListenWord?.word}"`}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full flex items-center justify-between px-1">
              {!listenChecked ? (
                <button onClick={handleCheckListenAnswer} disabled={!userAnswer.trim()} className="w-full bg-green-400 text-white font-bold text-xs p-3.5 rounded-xl transition hover:opacity-95 disabled:opacity-40 shadow-md">Kiểm tra đáp án ✔</button>
              ) : (
                <button onClick={handleNextListenCard} className="w-full bg-gray-800 text-white font-bold text-xs p-3.5 rounded-xl transition hover:opacity-95 shadow-md">
                  {listenIndex === shuffledPool.length - 1 ? 'Hoàn thành bài nghe 🎉' : 'Từ tiếp theo →'}
                </button>
              )}
            </div>
          </div>
        </div>
      );

    case 'quiz':
      if (quizQuestions.length === 0) return null;
      const currentQuestion = quizQuestions[quizIndex];

      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">📝 Trắc nghiệm từ vựng — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-emerald-600 px-3 py-1.5 rounded-full">Câu: {quizIndex + 1}/{quizQuestions.length}</span>
          </header>

          <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center gap-5">
            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden shadow-inner">
              <div className="bg-green-400 h-full transition-all duration-300" style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }} />
            </div>

            <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">TOEIC Form Part 5 Question</span>
                <span className="text-[11px] font-black text-gray-400 bg-gray-50 px-3 py-0.5 rounded-full border border-gray-100">Đúng: {quizScore} câu</span>
              </div>
              <h3 className="text-gray-800 font-bold text-base leading-relaxed tracking-tight mt-1">"{currentQuestion.maskedSentence}"</h3>
              <div className="w-full h-[1px] bg-gray-100 my-1" />
              <p className="text-gray-400 text-xs font-medium">Chọn từ thích hợp điền vào câu trên dựa theo nghĩa: <strong className="text-gray-700 font-bold text-xs">"{currentQuestion.meaning}"</strong></p>
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                let optionStyle = 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
                if (!quizChecked && isSelected) optionStyle = 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm';
                else if (quizChecked) {
                  if (isCorrect) optionStyle = 'bg-green-50 border-green-500 text-green-700 font-bold';
                  else if (isSelected && !isCorrect) optionStyle = 'bg-red-50 border-red-400 text-red-700';
                  else optionStyle = 'bg-white border-gray-100 text-gray-300 opacity-60 pointer-events-none';
                }

                return (
                  <button
                    key={idx}
                    disabled={quizChecked}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full p-4 border rounded-2xl text-left font-semibold text-sm transition-all duration-150 cursor-pointer flex items-center gap-3 ${optionStyle}`}
                  >
                    <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black border ${isSelected ? 'bg-amber-400 border-amber-400 text-white' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>{String.fromCharCode(65 + idx)}</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {quizChecked && (
              <div className="w-full bg-gray-800 text-white rounded-2xl p-4 shadow-md flex flex-col gap-1.5 animate-fadeIn">
                <span className="text-[9px] font-black text-green-400 tracking-wider uppercase">Giải thích ngữ cảnh</span>
                <p className="text-xs font-bold">{currentQuestion.correctAnswer} {currentQuestion.ipa} : {currentQuestion.meaning}</p>
                <p className="text-[11px] text-gray-300 leading-relaxed italic mt-1">"Example: {currentQuestion.example}"</p>
              </div>
            )}

            <div className="w-full mt-1">
              {!quizChecked ? (
                <button disabled={!selectedOption} onClick={handleCheckQuizAnswer} className="w-full bg-green-400 text-white font-bold text-xs p-4 rounded-xl shadow-md border-none cursor-pointer">Kiểm tra câu trả lời</button>
              ) : (
                <button onClick={handleNextQuizQuestion} className="w-full bg-gray-800 text-white font-bold text-xs p-4 rounded-xl shadow-md border-none cursor-pointer">
                  {quizIndex === quizQuestions.length - 1 ? 'Xem kết quả & Hoàn thành 🎉' : 'Câu tiếp theo →'}
                </button>
              )}
            </div>
          </div>
        </div>
      );

    case 'typer':
      // 🌟 PHÁT TRIỂN MỚI: GIAO DIỆN MINI-GAME ĐUA TỐC ĐỘ GÕ TỪ CHUẨN XÁC (`mode=typer`)
      if (shuffledPool.length === 0) return null;
      const currentTyperWord = shuffledPool[typerIndex];
      const maskedTyperSentence = currentTyperWord?.example.replace(new RegExp(`\\b${currentTyperWord?.word}\\b`, 'gi'), '_____');

      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          {/* HEADER GAME */}
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Bỏ cuộc</button>
            <span className="text-white font-black text-sm text-center flex-1">⚡ Đua tốc độ gõ chữ — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-emerald-600 px-3 py-1.5 rounded-full">Từ: {typerIndex + 1}/{shuffledPool.length}</span>
          </header>

          <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center gap-6">
            
            {/* VÙNG ĐẾM NGƯỢC THỜI GIAN THEO GIÂY VÀ ĐIỂM SỐ SỐNG ĐỘNG */}
            <div className="flex items-center justify-between bg-white border border-gray-100 p-4 px-6 rounded-2xl shadow-sm w-full">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Thời gian còn lại</span>
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

            {/* THANH THỜI GIAN CO NGẮN TRỰC QUAN ĐỂ TẠO ÁP LỰC GIẢI TRÍ */}
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-amber-400'}`} 
                style={{ width: `${(timeLeft / 15) * 100}%` }}
              />
            </div>

            {/* CARD GỢI Ý CÂU HỎI VÀ ĐỤC LỖ NGỮ CẢNH */}
            <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col items-center gap-4 text-center">
              <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">Spelling & Context Clue</span>
              
              <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 my-1">
                <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block mb-1">Nghĩa tiếng Việt cần tìm</span>
                <p className="text-gray-800 font-black text-lg leading-snug">{currentTyperWord?.meaning}</p>
                <p className="text-gray-400 font-mono text-xs font-bold mt-1 bg-white inline-block px-3 py-0.5 rounded-full border border-gray-100">Ký tự gợi ý: {currentTyperWord?.word.length} chữ cái | {currentTyperWord?.ipa}</p>
              </div>

              <div className="w-full bg-emerald-50/30 rounded-2xl p-4 border border-emerald-100/40 text-left">
                <span className="text-[9px] font-black text-emerald-600 tracking-wider uppercase block mb-1">Ngữ cảnh câu hỗ trợ</span>
                <p className="text-gray-600 italic text-xs leading-relaxed font-medium">"{maskedTyperSentence}"</p>
              </div>

              {/* Ô NHẬP LIỆU TỐC ĐỘ (INPUT CHỮ) */}
              <div className="w-full flex flex-col gap-2 mt-2">
                <input 
                  type="text"
                  autoFocus
                  value={typerInput}
                  onChange={handleTyperInputChange}
                  placeholder="Nhìn nghĩa dịch và gõ nhanh từ tiếng Anh..."
                  className="w-full p-4 border border-gray-200 rounded-2xl text-center font-black text-base tracking-wide bg-white focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-50 shadow-inner"
                />
                <span className="text-[10px] font-bold text-gray-300 animate-pulse">💡 Hệ thống tự động nhảy từ mới ngay khi bạn gõ chính xác 100%!</span>
              </div>
            </div>

            {/* NÚT BỎ QUA CÂU NẾU GẶP TỪ KHÓ TRONG GAME */}
            <button 
              onClick={handleNextTyperWord}
              className="w-full bg-gray-200 text-gray-500 font-bold text-xs p-3.5 rounded-xl border-none cursor-pointer transition hover:bg-gray-300 shadow-sm"
            >
              Bỏ qua từ này (Chấp nhận tính sai) ➔
            </button>

          </div>
        </div>
      );

    case 'learn':
    default:
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col p-6`}>
          <div className="max-w-2xl w-full mx-auto bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mt-10">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📚 Chế độ: {mode === 'learn' ? 'Học từ vựng' : mode.toUpperCase()}</h2>
            <p className="text-gray-400 text-xs mb-6">Chủ đề {topic?.id}: {topic?.title}</p>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {words.map((item, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50/50 flex flex-col gap-1 text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-green-500">{item.word}</span>
                    <span className="text-xs text-gray-400 font-mono">{item.ipa}</span>
                  </div>
                  <p className="text-gray-700 font-medium text-xs">Nghĩa: {item.meaning}</p>
                  <p className="text-gray-400 italic text-[11px]">Ví dụ: "{item.example}"</p>
                </div>
              ))}
            </div>
            <button onClick={() => handleFinishSession()} className="mt-6 w-full bg-green-400 text-white font-bold text-xs p-3.5 rounded-xl transition hover:opacity-95 shadow-md">Hoàn thành phần học này</button>
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