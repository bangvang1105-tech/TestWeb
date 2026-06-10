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

// 🌟 NÂNG CẤP: Hàm xử lý CSV thông minh, không bao giờ bị mất hoặc cắt cụt câu ví dụ
function parseCSVToJSON(csvText) {
  const lines = csvText.split(/\r?\n/);
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let insideQuote = false;
    let currentCell = '';
    
    // Duyệt qua từng ký tự để parse chuẩn quy tắc đóng ngoặc kép của Excel/Google Sheets
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

function VocabularyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'learn'; // Mặc định chế độ nếu không truyền là learn
  const topicId = searchParams.get('topic'); 

  const topic = VOCAB_TOPICS.find(t => String(t.id) === String(topicId));

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (!topicId) return;

    async function fetchAndParseExcelData() {
      try {
        setLoading(true);
        setError(null);
        setIsFlipped(false);
        setCurrentIndex(0);

        const docSnap = await getDoc(doc(db, 'vocab_lessons', String(topicId)));
        if (!docSnap.exists()) {
          throw new Error('Chưa cấu hình liên kết dữ liệu vocabUrl cho chủ đề này trên Firestore.');
        }

        const data = docSnap.data();
        let rawUrl = data.vocabUrl;

        if (!rawUrl) {
          throw new Error('Đường dẫn trích xuất file đang trống.');
        }

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
        if (!response.ok) {
          throw new Error('Không thể đọc file từ Drive. Hãy kiểm tra lại quyền xem Công khai của file.');
        }

        const csvText = await response.text();
        const parsedData = parseCSVToJSON(csvText);
        
        if (parsedData.length === 0) {
          throw new Error('File tài liệu trống hoặc sai quy cách đặt tên 4 cột.');
        }

        setWords(parsedData);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAndParseExcelData();
  }, [topicId]);

  const handleFinishSession = async () => {
    if (!CURRENT_USER_ID) {
      router.push('/home');
      return;
    }
    try {
      const progressRef = doc(db, 'users', CURRENT_USER_ID, 'progress', `vocab_${mode}_${topicId}`);
      await setDoc(progressRef, {
        status: 'completed',
        score: words.length,
        totalQuestions: words.length,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert('🎉 Chúc mừng bạn đã hoàn thành trọn vẹn nội dung phần học này!');
      router.push('/home');
    } catch (err) {
      console.error(err);
      router.push('/home');
    }
  };

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
        Đang nạp dữ liệu từ file Excel trực tuyến...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-2xl mb-2">⚠️</div>
        <h3 className="text-gray-800 font-bold text-sm">Lỗi đồng bộ dữ liệu</h3>
        <p className="text-gray-400 text-xs max-w-md mt-1 mb-4 leading-relaxed">{error}</p>
        <button onClick={() => router.back()} className="bg-green-400 text-white font-bold text-xs p-2 px-5 rounded-xl">Quay lại danh mục</button>
      </div>
    );
  }

  const currentCard = words[currentIndex];

  // 🌟 NÂNG CẤP LOGIC RENDER: Tách biệt các phân hệ học dựa theo tham số mode truyền vào URL
  switch (mode) {
    case 'flashcard':
      return (
        <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
          {/* HEADER FLASHCARD */}
          <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
            <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát</button>
            <span className="text-white font-black text-sm text-center flex-1">🃏 Flashcards — {topic?.title}</span>
            <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{currentIndex + 1}/{words.length}</span>
          </header>

          {/* CONTAINER THỂ HIỆN FLASHCARD */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl w-full mx-auto gap-8">
            <div onClick={() => setIsFlipped(!isFlipped)} className="w-full h-80 cursor-pointer [perspective:1000px] select-none">
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                
                {/* MẶT TRƯỚC */}
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-white border border-gray-100 shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
                  <span className="text-xs font-bold text-green-400 tracking-widest uppercase mb-2">English Word</span>
                  <h2 className="text-4xl font-black text-gray-800 tracking-tight">{currentCard?.word}</h2>
                  <p className="text-sm font-semibold text-gray-400 mt-2 bg-gray-50 px-3 py-1 rounded-full">{currentCard?.ipa}</p>
                  <p className="text-[11px] font-medium text-gray-300 mt-10 animate-pulse">💡 Click vào thẻ để lật xem nghĩa và câu ví dụ</p>
                </div>

                {/* MẶT SAU: Câu ví dụ hiện đầy đủ không lo bị cắt */}
                <div className="absolute inset-0 w-full h-full rounded-3xl bg-emerald-500 text-white shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="text-xs font-bold text-emerald-100 tracking-widest uppercase mb-1">Vietnamese Meaning</span>
                  <h3 className="text-2xl font-bold px-2 leading-snug">{currentCard?.meaning}</h3>
                  <div className="w-full h-[1px] bg-white/20 my-5" />
                  <span className="text-[10px] font-bold text-emerald-100 tracking-widest uppercase mb-1">Context Example</span>
                  <p className="text-xs font-medium max-w-sm italic leading-relaxed text-emerald-50 px-2">
                    "{currentCard?.example}"
                  </p>
                </div>

              </div>
            </div>

            {/* BUTTON ĐIỀU HƯỚNG */}
            <div className="flex items-center justify-between w-full px-2 gap-4">
              <button onClick={handlePrevCard} disabled={currentIndex === 0} className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold text-xs p-3.5 rounded-xl transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">← Từ trước đó</button>
              <button onClick={handleNextCard} className="flex-1 bg-green-400 shadow-md shadow-green-400/20 text-white font-bold text-xs p-3.5 rounded-xl transition hover:opacity-95">
                {currentIndex === words.length - 1 ? 'Hoàn thành bài học 🎉' : 'Từ tiếp theo →'}
              </button>
            </div>
          </div>
        </div>
      );

    case 'learn':
    default:
      // Giao diện mẫu cho các mục con khác (Học từ vựng cơ bản, Trắc nghiệm...) để không bị dính Flashcard
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
            <button onClick={() => handleFinishSession()} className="mt-6 w-full bg-green-400 text-white font-bold text-xs p-3.5 rounded-xl transition hover:opacity-95 shadow-md shadow-green-400/10">Hoàn thành phần học này</button>
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