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

// Hàm tiện ích phân tích chuỗi văn bản CSV từ Google Drive thành mảng Object
function parseCSVToJSON(csvText) {
  const lines = csvText.split('\n');
  const result = [];
  
  // Bỏ qua dòng tiêu đề đầu tiên (word, ipa, meaning, example), duyệt từ dòng thứ 2
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Xử lý dấu phẩy nằm bên trong dấu ngoặc kép của câu ví dụ
    const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    
    if (matches.length >= 3) {
      const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
      result.push({
        word: clean(matches[0]),
        ipa: clean(matches[1]),
        meaning: clean(matches[2]),
        example: clean(matches[3]) || 'Chưa có câu ví dụ thực tế.'
      });
    }
  }
  return result;
}

function VocabularyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'flashcard'; 
  const topicId = searchParams.get('topic'); 

  const topic = VOCAB_TOPICS.find(t => String(t.id) === String(topicId));

  // States quản lý trạng thái ứng dụng
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

        // Bước 1: Lấy đường dẫn file Excel trên Google Drive từ Firebase Firestore
        const docSnap = await getDoc(doc(db, 'vocab_lessons', String(topicId)));
        
        if (!docSnap.exists()) {
          throw new Error('Không tìm thấy cấu hình link dữ liệu cho chủ đề này trên Firebase.');
        }

        const data = docSnap.data();
        let rawUrl = data.vocabUrl;

        if (!rawUrl) {
          throw new Error('Dữ liệu đường dẫn vocabUrl đang trống.');
        }

        // Bước 2: Kỹ thuật biến đổi link Google Drive từ dạng xem sang luồng xuất dữ liệu CSV trực tiếp
        // Thay thế đoạn kết đuôi /edit... thành /export?format=csv
        let exportCsvUrl = rawUrl;
        if (rawUrl.includes('/edit')) {
          exportCsvUrl = rawUrl.split('/edit')[0] + '/export?format=csv';
        } else if (!rawUrl.includes('/export')) {
          // Trường hợp link dạng share rút gọn, cố gắng lấy ID để build link export
          const match = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match && match[1]) {
            exportCsvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
          }
        }

        // Bước 3: Đọc file trực tuyến từ Google Drive
        const response = await fetch(exportCsvUrl);
        if (!response.ok) {
          throw new Error('Không thể tải file từ Google Drive. Vui lòng kiểm tra lại quyền chia sẻ công khai của file.');
        }

        const csvText = await response.text();
        
        // Bước 4: Chuyển đổi sang mảng dữ liệu cấu trúc để nạp vào Flashcard
        const parsedData = parseCSVToJSON(csvText);
        
        if (parsedData.length === 0) {
          throw new Error('File excel không chứa dữ liệu hoặc sai định dạng cấu trúc cột.');
        }

        setWords(parsedData);
      } catch (err) {
        console.error("Lỗi quy trình phân hệ Từ vựng: ", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAndParseExcelData();
  }, [topicId]);

  // Đồng bộ trạng thái hoàn thành học lên Firebase cá nhân học viên
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

      alert('🎉 Hệ thống đã ghi nhận tiến trình! Bạn đã hoàn thành 30 từ vựng cốt lõi của chủ đề hôm nay!');
      router.push('/home');
    } catch (err) {
      console.error("Lỗi đồng bộ tiến trình từ vựng: ", err);
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
        Hệ thống đang kết nối Google Drive và nạp file Excel bài học...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-gray-800 font-bold text-sm">Lỗi nạp tư liệu từ vựng trực tuyến</h3>
        <p className="text-gray-400 text-xs max-w-md mt-1 mb-4 leading-relaxed">{error}</p>
        <button onClick={() => router.back()} className="bg-green-400 text-white font-bold text-xs p-2 px-5 rounded-xl shadow-sm">Quay lại danh mục</button>
      </div>
    );
  }

  const currentCard = words[currentIndex];

  return (
    <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
      {/* HEADER */}
      <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
        <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát học</button>
        <span className="text-white font-black text-sm text-center flex-1">🃏 Flashcard — Chủ đề {topic?.id}: {topic?.title}</span>
        <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Từ: {currentIndex + 1}/{words.length}</span>
      </header>

      {/* MAIN BODY */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl w-full mx-auto gap-8">
        
        {/* VÙNG THẺ FLASHCARD 3D EFFECT */}
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full h-80 cursor-pointer [perspective:1000px] select-none"
        >
          <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
            
            {/* MẶT TRƯỚC: TIẾNG ANH (FRONT SIDE) */}
            <div className="absolute inset-0 w-full h-full rounded-3xl bg-white border border-gray-100 shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
              <span className="text-xs font-bold text-green-400 tracking-widest uppercase mb-2">English Word</span>
              <h2 className="text-4xl font-black text-gray-800 tracking-tight">{currentCard?.word}</h2>
              <p className="text-sm font-semibold text-gray-400 mt-2 bg-gray-50 px-3 py-1 rounded-full">{currentCard?.ipa}</p>
              <p className="text-[11px] font-medium text-gray-300 mt-10 animate-pulse">💡 Bấm vào thẻ để xem ngữ nghĩa Tiếng Việt & Ví dụ</p>
            </div>

            {/* MẶT SAU: TIẾNG VIỆT + CÂU VÍ DỤ (BACK SIDE) */}
            <div className="absolute inset-0 w-full h-full rounded-3xl bg-emerald-500 text-white shadow-xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <span className="text-xs font-bold text-emerald-100 tracking-widest uppercase mb-1">Vietnamese Meaning</span>
              <h3 className="text-2xl font-bold px-2 leading-snug">{currentCard?.meaning}</h3>
              
              <div className="w-full h-[1px] bg-white/20 my-5" />
              
              <span className="text-[10px] font-bold text-emerald-100 tracking-widest uppercase mb-1">Context Example</span>
              <p className="text-xs font-medium max-w-sm italic leading-relaxed text-emerald-50">
                "{currentCard?.example}"
              </p>
            </div>

          </div>
        </div>

        {/* ĐIỀU HƯỚNG CHUYỂN ĐỔI THẺ */}
        <div className="flex items-center justify-between w-full px-2 gap-4">
          <button 
            onClick={handlePrevCard}
            disabled={currentIndex === 0}
            className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold text-xs p-3.5 rounded-xl transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            ← Từ trước đó
          </button>
          
          <button 
            onClick={handleNextCard}
            className="flex-1 bg-green-400 shadow-md shadow-green-400/20 text-white font-bold text-xs p-3.5 rounded-xl transition hover:opacity-95"
          >
            {currentIndex === words.length - 1 ? 'Hoàn thành bài học 🎉' : 'Từ tiếp theo →'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function VocabularyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-xs font-bold">Đang nạp tiến trình học từ vựng...</div>}>
      <VocabularyContent />
    </Suspense>
  );
}