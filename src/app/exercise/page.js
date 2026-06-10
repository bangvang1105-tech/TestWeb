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

// BỘ DỮ LIỆU GIẢ LẬP ĐẦY ĐỦ CẤU TRÚC CHIẾN THUẬT CHO CẢ 4 PART NGHE CHÉP CHÍNH TẢ
const SAMPLE_DICTATION_DATA = {
  // Part 1: Nghe chép chính tả nguyên câu (Đầy đủ chủ ngữ, động từ)
  dictation_p1: [
    {
      id: 1,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      meaning: 'Họ đang đi bộ dọc theo bến tàu.',
      correctAnswer: 'They are walking along the pier',
      hint: 'T_ _ _ _ a_ _ w_ _ _ _ _ _ a_ _ _ _ t_ _ p_ _ _'
    },
    {
      id: 2,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      meaning: 'Một số tài liệu đang được sắp xếp trên bàn làm việc.',
      correctAnswer: 'Some documents are being arranged on the desk',
      hint: 'S_ _ _ d_ _ _ _ _ _ _ _ a_ _ b_ _ _ _ a_ _ _ _ _ _ _ o_ t_ _ d_ _ _'
    }
  ],
  // Part 2: Bắt cấu trúc/Từ để hỏi cốt lõi
  dictation_p2: [
    {
      id: 1,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      meaning: 'Khi nào thì ngân sách tiếp thị sẽ được phê duyệt?',
      correctAnswer: 'When will',
      maskedSentence: '[...] [...] the marketing budget be approved?',
      hint: 'Từ để hỏi về thời gian (5W1H) + Trợ động từ tương lai đơn'
    }
  ],
  // Part 3: Đục lỗ kịch bản hội thoại đoạn văn (Nhiều người nói - Multi-speaker Script)
  dictation_p3: [
    {
      id: 1,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      isParagraphMode: true, // Biến cờ bật giao diện đục lỗ đoạn văn kịch bản
      meaning: 'Cuộc đối thoại giữa người quản lý và nhà cung ứng vật tư văn phòng.',
      // Mảng chứa toàn bộ kịch bản, các từ cần điền sẽ nằm trong thuộc tính gapKey
      scriptParagraphs: [
        { speaker: 'Man', text: 'Hello, this is Mark from accounting. I am calling to check on the status of our office ' },
        { speaker: 'Man', isGap: true, gapId: 0, correctAnswer: 'supplies', hint: 'vật tư, nhu yếu phẩm' },
        { speaker: 'Man', text: ' order that we placed last Tuesday. According to the ' },
        { speaker: 'Man', isGap: true, gapId: 1, correctAnswer: 'invoice', hint: 'hóa đơn giao hàng' },
        { speaker: 'Man', text: ', it should have arrived by yesterday morning.' },
        { speaker: 'Woman', text: 'Hi Mark, let me check that for you. Ah, I see a small delay in our ' },
        { speaker: 'Woman', isGap: true, gapId: 2, correctAnswer: 'logistics', hint: 'khâu hậu cần, vận chuyển' },
        { speaker: 'Woman', text: ' network due to the storm. However, the courier confirmed the shipment is out for ' },
        { speaker: 'Woman', isGap: true, gapId: 3, correctAnswer: 'delivery', hint: 'sự giao hàng' },
        { speaker: 'Woman', text: ' today and will reach your office before 4:00 PM.' }
      ]
    }
  ],
  // Part 4: Đục lỗ kịch bản bài nói ngắn (Một người độc thoại - Monologue Talk)
  dictation_p4: [
    {
      id: 1,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      isParagraphMode: true,
      meaning: 'Một thông báo nội bộ của Ban quản đốc nhà máy gửi toàn thể nhân viên.',
      scriptParagraphs: [
        { speaker: 'Speaker', text: 'Attention all factory personnel. Management has decided to ' },
        { speaker: 'Speaker', isGap: true, gapId: 0, correctAnswer: 'allocate', hint: 'phân bổ, cấp phát' },
        { speaker: 'Speaker', text: ' additional funds to update our corporate ' },
        { speaker: 'Speaker', isGap: true, gapId: 1, correctAnswer: 'facilities', hint: 'cơ sở vật chất, trang thiết bị' },
        { speaker: 'Speaker', text: '. Starting next Monday, the main workshop will undergo inspection to evaluate safety and workplace ' },
        { speaker: 'Speaker', isGap: true, gapId: 2, correctAnswer: 'efficiency', hint: 'hiệu suất, tính hiệu quả' },
        { speaker: 'Speaker', text: '. Please ensure all tools are stored in their designated storage cabinets.' }
      ]
    }
  ]
};

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';

  // States quản trị logic chung
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState(''); // Dùng cho Part 1 & Part 2
  const [paragraphInputs, setParagraphInputs] = useState({}); // Dùng riêng lưu trữ nhiều ô trống cho Part 3 & Part 4
  const [isCheck, setIsCheck] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // LÀM SẠCH VÀ NẠP TIẾN TRÌNH DỮ LIỆU THEO PART
  useEffect(() => {
    setLoading(true);
    const data = SAMPLE_DICTATION_DATA[partKey] || [];
    setQuestions(data);
    setCurrentIndex(0);
    setUserInput('');
    setParagraphInputs({});
    setIsCheck(false);
    setShowHint(false);
    setLoading(false);
  }, [partKey]);

  // HÀM CHUẨN HÓA CHUỖI ĐỂ ĐỐI SOÁT CHÍNH XÁC TUYỆT ĐỐI
  const cleanStr = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").replace(/\s+/g, " ").trim();
  };

  // LOGIC KIỂM TRA ĐÁP ÁN
  const handleCheckAnswer = () => {
    const currentQ = questions[currentIndex];

    if (currentQ.isParagraphMode) {
      // Logic kiểm tra cho Part 3 & 4 (Đoạn văn nhiều ô trống)
      let allCorrect = true;
      const gaps = currentQ.scriptParagraphs.filter(p => p.isGap);
      
      gaps.forEach((gap) => {
        const userAnswerVal = paragraphInputs[gap.gapId] || '';
        if (cleanStr(userAnswerVal) !== cleanStr(gap.correctAnswer)) {
          allCorrect = false;
        }
      });
      
      setIsCorrect(allCorrect);
      setIsCheck(true);
    } else {
      // Logic kiểm tra cho Part 1 & 2 (Một ô nhập duy nhất)
      if (!userInput.trim()) return;
      const isMatched = cleanStr(userInput) === cleanStr(currentQ.correctAnswer);
      setIsCorrect(isMatched);
      setIsCheck(true);
    }
  };

  // ĐIỀU HƯỚNG SANG CÂU MỚI HOẶC ĐỒNG BỘ NỘP ĐIỂM FIREBASE
  const handleNextQuestion = async () => {
    setUserInput('');
    setParagraphInputs({});
    setIsCheck(false);
    setShowHint(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (CURRENT_USER_ID) {
        try {
          await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_${partKey}`), {
            status: 'completed',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error('Lỗi lưu tiến trình Firebase:', err);
        }
      }
      alert('🎉 Chúc mừng! Bạn đã hoàn thành xuất sắc toàn bộ bài tập nghe chép chính tả của phân hệ này!');
      router.push('/home');
    }
  };

  // Cập nhật giá trị gõ của từng ô trống cụ thể trong kịch bản Part 3/4
  const handleParagraphInputChange = (gapId, value) => {
    setParagraphInputs(prev => ({
      ...prev,
      [gapId]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-xs font-bold gap-3">
        <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        Hệ thống đang đồng bộ học liệu nghe chép chính tả...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-3xl mb-2">🚀</div>
        <h3 className="text-gray-800 font-bold text-sm">Nội dung đang được nạp</h3>
        <p className="text-gray-400 text-xs max-w-sm mt-1 mb-4 leading-relaxed">Bài tập nghe chép chính tả cho phân hệ này đang được Thầy Băng biên soạn và đồng bộ lên hệ thống.</p>
        <button onClick={() => router.back()} className="bg-green-400 text-white font-bold text-xs p-2 px-5 rounded-xl border-none cursor-pointer">Quay lại trang chủ</button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col antialiased`}>
      {/* HEADER BÀI TẬP */}
      <header className="bg-green-400 p-3.5 px-5 flex items-center justify-between shadow-md">
        <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát</button>
        <span className="text-white font-black text-sm text-center flex-1 uppercase tracking-wider">✍️ Dictation — {partKey.replace('_', ' ').toUpperCase()}</span>
        <span className="text-white text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Câu: {currentIndex + 1}/{questions.length}</span>
      </header>

      {/* BODY CHỨA NỘI DUNG TƯƠNG TÁC */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col justify-center gap-5">
        
        {/* THANH TIẾN TRÌNH TRỰC QUAN */}
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden shadow-inner">
          <div className="bg-green-400 h-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>

        {/* CARD TRÌNH PHÁT VÀ NỘI DUNG CHÍNH */}
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 flex flex-col items-center gap-5 text-center">
          <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">TOEIC Audio Player</span>
          
          {/* Trình phát Audio HTML5 cốt lõi */}
          <audio controls src={currentQ.audioUrl} className="w-full mt-1 focus:outline-none" key={currentIndex} autoPlay />

          <div className="w-full h-[1px] bg-gray-100 my-1" />

          {/* HIỂN THỊ CÂU HỎI ĐỤC LỖ CHO PART 2 */}
          {!currentQ.isParagraphMode && partKey === 'dictation_p2' && currentQ.maskedSentence && (
            <div className="text-left w-full">
              <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block mb-1">Cấu trúc câu đục lỗ:</span>
              <p className="text-gray-800 font-bold text-base bg-gray-50 p-3 rounded-xl border border-gray-100">"{currentQ.maskedSentence}"</p>
            </div>
          )}

          {/* 🌟 PHÁT TRIỂN MỚI: GIAO DIỆN ĐỤC LỖ ĐOẠN VĂN KỊCH BẢN (DÀNH CHO PART 3 & PART 4) */}
          {currentQ.isParagraphMode && currentQ.scriptParagraphs && (
            <div className="text-left w-full bg-slate-50 p-5 rounded-2xl border border-gray-200/60 shadow-inner">
              <span className="text-[9px] font-black text-green-500 tracking-wider uppercase block mb-3">Kịch bản bài nghe (Fill in the blanks):</span>
              
              <div className="text-gray-700 text-sm font-medium leading-relaxed tracking-wide space-y-2">
                {currentQ.scriptParagraphs.map((segment, idx) => {
                  if (segment.isGap) {
                    const isInputCorrect = cleanStr(paragraphInputs[segment.gapId]) === cleanStr(segment.correctAnswer);
                    
                    return (
                      <span key={idx} className="inline-block mx-1 relative align-baseline">
                        <input
                          type="text"
                          disabled={isCheck}
                          value={paragraphInputs[segment.gapId] || ''}
                          onChange={(e) => handleParagraphInputChange(segment.gapId, e.target.value)}
                          placeholder={showHint ? `(${segment.hint})` : `[..${segment.gapId + 1}..]`}
                          style={{ width: `${Math.max(segment.correctAnswer.length * 10, 90)}px` }}
                          className={`p-1 px-2 border text-center font-bold text-xs rounded-lg transition-all duration-150 focus:outline-none focus:ring-2
                            ${isCheck 
                              ? (isInputCorrect ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-800') 
                              : 'bg-white border-gray-300 focus:border-green-400 focus:ring-green-100'}`}
                        />
                        {/* Hiện đáp án đúng nhỏ chân phương nếu học viên gõ sai */}
                        {isCheck && !isInputCorrect && (
                          <span className="block text-[10px] text-green-600 font-bold text-center font-mono mt-0.5">Ans: {segment.correctAnswer}</span>
                        )}
                      </span>
                    );
                  } else {
                    return (
                      <span key={idx} className={segment.speaker === 'Woman' ? 'text-purple-700 font-medium' : 'text-gray-800'}>
                        {/* Hiển thị tag tên người nói ở đầu đoạn thoại */}
                        {idx === 0 || currentQ.scriptParagraphs[idx - 1]?.speaker !== segment.speaker ? (
                          <strong className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mt-2 mb-0.5">{segment.speaker}:</strong>
                        ) : null}
                        {segment.text}
                      </span>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* BẢN DỊCH GỢI Ý NỀN */}
          <div className="text-left w-full flex flex-col gap-1">
            <span className="text-[9px] font-black text-emerald-500 tracking-wider uppercase">Bản dịch nghĩa nội dung:</span>
            <p className="text-gray-600 font-medium text-xs italic leading-relaxed">" {currentQ.meaning} "</p>
          </div>

          {/* GỢI Ý KÝ TỰ CHO PART 1 & PART 2 (NẾU BẬT) */}
          {!currentQ.isParagraphMode && showHint && currentQ.hint && (
            <div className="w-full bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 text-left animate-fadeIn">
              <span className="text-[9px] font-black text-amber-600 tracking-wider uppercase block mb-0.5">Gợi ý ký tự cấu trúc câu:</span>
              <p className="text-gray-700 font-mono text-xs font-bold tracking-wide">{currentQ.hint}</p>
            </div>
          )}

          {/* Ô NHẬP LIỆU CHÉP CHÍNH TẢ CHO PART 1 & PART 2 */}
          {!currentQ.isParagraphMode && (
            <div className="w-full flex flex-col gap-2 mt-2">
              <textarea
                rows={3}
                value={userInput}
                disabled={isCheck}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={partKey === 'dictation_p2' ? "Nhập từ khóa nghe được..." : "Nghe và gõ lại nguyên văn câu tiếng Anh chuẩn xác tại đây..."}
                className={`w-full p-4 border rounded-2xl font-semibold text-sm transition focus:outline-none focus:ring-2 resize-none leading-relaxed
                  ${isCheck 
                    ? (isCorrect ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700') 
                    : 'bg-white border-gray-200 focus:border-green-400 focus:ring-green-100'}`}
              />

              {/* KHUNG HIỂN THỊ ĐÁP ÁN SO SÁNH */}
              {isCheck && (
                <div className={`p-4 rounded-xl text-xs text-left font-semibold border flex flex-col gap-1 animate-fadeIn ${isCorrect ? 'bg-green-100/50 border-green-200 text-green-800' : 'bg-red-100/50 border-red-200 text-red-800'}`}>
                  <span>{isCorrect ? '🎉 Tuyệt vời! Bạn đã nghe và ghi lại hoàn toàn chính xác.' : '❌ Chưa chính xác rồi! Hãy đối chiếu với đáp án chuẩn phía dưới:'}</span>
                  <p className="font-bold text-sm mt-1 font-sans text-gray-800">👉 "{currentQ.correctAnswer}"</p>
                </div>
              )}
            </div>
          )}

          {/* KHUNG THÔNG BÁO TỔNG QUAN CHO ĐOẠN VĂN PART 3 & PART 4 KHI CHECK */}
          {currentQ.isParagraphMode && isCheck && (
            <div className={`w-full p-3.5 rounded-xl text-xs font-bold text-left border ${isCorrect ? 'bg-green-100/60 border-green-200 text-green-800' : 'bg-amber-100/60 border-amber-200 text-amber-800'}`}>
              {isCorrect ? '🎉 Xuất sắc! Bạn đã lấp đầy toàn bộ từ khóa kịch bản chính xác 100%.' : '⚠️ Có một số từ khóa chưa khớp, hãy đối chiếu các ô chữ màu xanh/đỏ phía trên nhé.'}
            </div>
          )}
        </div>

        {/* THANH ĐIỀU HƯỚNG NÚT BẤM CẠNH DƯỚI */}
        <div className="flex items-center gap-3 w-full px-1">
          {/* Nút gợi ý (Chỉ hiển thị cho Part 1, 2 hoặc khi chưa kiểm tra đáp án) */}
          {!isCheck && (partKey === 'dictation_p1' || partKey === 'dictation_p2') && (
            <button 
              onClick={() => setShowHint(!showHint)}
              className="bg-amber-400 text-white font-bold text-xs p-3.5 px-5 rounded-xl border-none cursor-pointer transition hover:opacity-95 shadow-md shadow-amber-500/10"
            >
              💡 {showHint ? 'Ẩn gợi ý' : 'Gợi ý'}
            </button>
          )}

          {/* Nút bật tắt nhanh nghĩa hỗ trợ gợi ý cho Part 3 & Part 4 */}
          {!isCheck && currentQ.isParagraphMode && (
            <button 
              onClick={() => setShowHint(!showHint)}
              className="bg-amber-400 text-white font-bold text-xs p-3.5 px-4 rounded-xl border-none cursor-pointer transition hover:opacity-95 shadow-md shadow-amber-500/10"
            >
              {showHint ? 'Ẩn nghĩa ô trống' : '💡 Hiện nghĩa ô trống'}
            </button>
          )}

          {!isCheck ? (
            <button
              onClick={handleCheckAnswer}
              className="flex-1 bg-green-400 text-white font-bold text-xs p-3.5 rounded-xl border-none cursor-pointer transition hover:opacity-95 shadow-md shadow-green-500/10"
            >
              Kiểm tra kết quả ✔
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="flex-1 bg-gray-800 text-white font-bold text-xs p-3.5 rounded-xl border-none cursor-pointer transition hover:opacity-95 shadow-md"
            >
              {currentIndex === questions.length - 1 ? 'Xem kết quả & Hoàn thành 🎉' : 'Câu tiếp theo ➔'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ExercisePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-xs font-bold">Đang tải cấu trúc bài luyện tập...</div>}>
      <ExerciseContent />
    </Suspense>
  );
}