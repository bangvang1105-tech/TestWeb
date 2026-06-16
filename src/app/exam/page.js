'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/firebase'; // Nhớ check đường dẫn import đúng nơi bạn cấu hình firebase nha
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function ExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const book = searchParams.get('book');
  const testId = searchParams.get('test');
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (!book || !testId) return;

    async function loadTestData() {
      try {
        // Cú pháp ghép chuỗi lấy Document ID (Ví dụ: ETS2023_01). 
        // Hãy chú ý: Nếu cấu trúc db của bạn đang là ETS2023_TEST_1, hãy đổi biến docId cho khớp nhé.
        const formattedTestId = testId.padStart(2, '0'); // Biến 1 thành '01'
        const docId = `${book.toUpperCase()}_${formattedTestId}`; // Ra kết quả: ETS2023_01
        
        const path = `toeic_tests/${docId}/questions`;
        
        const q = query(collection(db, path));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ép kiểu ID sang số để sắp xếp chuẩn từ câu 1 đến 200
        data.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        setQuestions(data);
      } catch (err) {
        console.error("Lỗi khi load đề:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTestData();
  }, [book, testId]);

  const handleSelectOption = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-semibold">Đang chuẩn bị đề thi cho bạn...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* HEADER BÀI THI */}
      <header className="max-w-7xl mx-auto mb-6 bg-white p-4 px-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-between items-center sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ← Thoát
          </button>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-widest">
            {book} - Test {testId}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="font-mono text-3xl font-bold text-red-500 bg-red-50 px-4 py-1.5 rounded-lg border border-red-100">
            120:00
          </div>
          <button className="bg-green-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-green-600 transition shadow-sm">
            Nộp bài
          </button>
        </div>
      </header>

      {/* KHU VỰC LÀM BÀI */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* CỘT TRÁI: HIỂN THỊ CÂU HỎI */}
        <div className="flex-[3] space-y-6">
          {questions.map((q) => (
            <div key={q.id} id={`question-${q.id}`} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-start gap-4 mb-4">
                <span className="w-10 h-10 shrink-0 bg-green-100 text-green-700 font-black rounded-full flex items-center justify-center">
                  {q.id}
                </span>
                <p className="font-semibold text-gray-800 text-lg leading-relaxed mt-1">
                  {q.question || `Câu hỏi ${q.id}`}
                </p>
              </div>

              <div className="pl-14 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const optionText = q[`option${opt}`] || q[`option_${opt.toLowerCase()}`]; // Bắt cả 2 loại key Excel
                  if (!optionText) return null; // Nếu không có text đáp án thì ẩn
                  const isSelected = answers[q.id] === opt;
                  
                  return (
                    <button 
                      key={opt}
                      onClick={() => handleSelectOption(q.id, opt)}
                      className={`text-left p-3 border-2 rounded-xl transition-all duration-200 ${
                        isSelected 
                        ? 'border-green-500 bg-green-50 text-green-800 font-bold shadow-sm' 
                        : 'border-gray-100 hover:border-green-300 text-gray-600'
                      }`}
                    >
                      <span className={`inline-block w-6 h-6 text-center rounded-full mr-2 text-sm ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                        {opt}
                      </span>
                      {optionText}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CỘT PHẢI: BẢNG CHỌN ĐÁP ÁN (ANSWER SHEET) */}
        <div className="flex-1">
          <div className="sticky top-28 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-800 mb-4 border-b border-gray-100 pb-3 flex justify-between">
              <span>Bảng Trả Lời</span>
              <span className="text-green-500">{Object.keys(answers).length} / 200</span>
            </h3>
            
            {/* Tạo ô hiển thị dạng Grid mượt mà */}
            <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {questions.map((q) => {
                const isAnswered = !!answers[q.id];
                return (
                  <button 
                    key={q.id} 
                    onClick={() => {
                      // Cuộn màn hình tới đúng câu hỏi
                      document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`w-full aspect-square border-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all ${
                      isAnswered 
                      ? 'bg-green-500 border-green-500 text-white shadow-sm' 
                      : 'border-gray-100 text-gray-500 hover:border-green-300'
                    }`}
                  >
                    <span>{q.id}</span>
                    {isAnswered && <span className="text-[10px] mt-0.5 font-black">{answers[q.id]}</span>}
                  </button>
                );
              })}
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}