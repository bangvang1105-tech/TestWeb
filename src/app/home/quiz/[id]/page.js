'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Roboto } from 'next/font/google';

// Hãy kiểm tra đường dẫn này để đảm bảo nó trỏ đúng đến file cấu hình Firebase của bạn
import { db } from '@/lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const BRAND = '#4ade80';

export default function AdvancedQuizPage() {
  const { id } = useParams(); // Lấy ID động từ URL (Ví dụ: grammar_1, vocab_1)
  const router = useRouter();
  
  // State quản lý dữ liệu lấy từ Firebase & Excel
  const [questions, setQuestions] = useState([]);
  const [mediaData, setMediaData] = useState({ imageUrl: '', audioUrl: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State quản lý trạng thái làm bài của học sinh
  const [userAnswers, setUserAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(null);

  // Ref giúp cuộn màn hình mượt mà khi đổi câu hỏi
  const questionRefs = useRef([]);

  useEffect(() => {
    async function fetchFullQuizData() {
      try {
        setLoading(true);
        
        // 1. TRUY VẤN FIREBASE LẤY DATA (Link Excel + Link Media)
        const docRef = doc(db, "lessons", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          throw new Error(`Không tìm thấy dữ liệu bài học "${id}" trên Firestore. Hãy kiểm tra lại Document ID.`);
        }

        const dataFromFirestore = docSnap.data();
        const driveLink = dataFromFirestore.drive_link;
        
        // Lưu link ảnh và audio vào State
        setMediaData({
          imageUrl: dataFromFirestore.image_url || '',
          audioUrl: dataFromFirestore.audio_url || ''
        });

        if (!driveLink) {
          throw new Error("Bài học này chưa được cấu hình trường 'drive_link' trên Firebase.");
        }

        // 2. BIẾN ĐỔI LINK DRIVE ĐỂ DOWNLOAD FILE EXCEL NGẦM
        const sheetId = driveLink.match(/\/d\/([^/]+)/)?.[1];
        if (!sheetId) throw new Error("Định dạng link Google Drive không hợp lệ.");
        const downloadUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

        // Tải file về dạng ArrayBuffer
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("Không thể kết nối tải file từ Drive. Hãy bật quyền công khai cho file Excel.");
        
        const arrayBuffer = await response.arrayBuffer();
        
        // 3. ĐỌC FILE EXCEL CHUYỂN THÀNH MẢNG CÂU HỎI JSON
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) throw new Error("File bài tập Excel trống rỗng.");

        setQuestions(jsonData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Đã xảy ra lỗi hệ thống.");
        setLoading(false);
      }
    }

    if (id) fetchFullQuizData();
  }, [id]);

  // Hàm xử lý cuộn màn hình khi click số câu ở Vùng 1
  const scrollToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    questionRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  };

  const handleSelectAnswer = (qIndex, option) => {
    setUserAnswers({ ...userAnswers, [qIndex]: option });
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === String(q.Correct).trim()) {
        correctCount++;
      }
    });
    setScore({ correct: correctCount, total: questions.length });
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Hệ thống đang tải dữ liệu và đồng bộ file bài tập...</div>;
  
  if (errorMsg) return (
    <div className="p-8 text-center max-w-md mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl">
      <p className="text-red-600 font-semibold mb-4">{errorMsg}</p>
      <button onClick={() => router.push('/home')} className="bg-white border px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50">Quay lại trang chủ</button>
    </div>
  );

  return (
    <div className={`h-screen flex flex-col bg-gray-100 ${roboto.className}`}>
      
      {/* ===== THANH TOOLBAR TRÊN CÙNG ===== */}
      <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-gray-800 tracking-wide text-sm bg-gray-100 px-3 py-1.5 rounded-lg">
            Mã bài: {id}
          </span>
        </div>
        
        {score === null && (
          <button
            onClick={handleSubmitQuiz}
            style={{ backgroundColor: BRAND }}
            className="text-white font-bold text-sm px-6 py-2 rounded-lg hover:opacity-90 transition shadow-sm"
          >
            Nộp bài làm
          </button>
        )}
        
        <button onClick={() => router.push('/home')} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition">
          Thoát
        </button>
      </header>

      {/* ===== KHU VỰC CHIA LÀM 3 VÙNG ĐỘC LẬP ===== */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* --- VÙNG 1: BẢNG SỐ CÂU (BÊN TRÁI - CHIẾM 20%) --- */}
        <aside className="w-1/5 bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Bảng tiến độ</h2>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((_, index) => {
                const isAnswered = userAnswers[index] !== undefined;
                const isCurrent = currentQuestionIndex === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => scrollToQuestion(index)}
                    style={isCurrent ? { borderColor: BRAND, color: BRAND } : isAnswered ? { backgroundColor: BRAND } : {}}
                    className={`h-10 rounded-lg text-xs font-bold border flex items-center justify-center transition-all duration-150
                      ${isCurrent ? 'bg-white border-2' : ''}
                      ${isAnswered && !isCurrent ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}
                    `}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
          
          {score !== null && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center shadow-sm">
              <span className="text-xs font-bold text-green-700 block uppercase">Kết quả</span>
              <span className="text-2xl font-black text-green-600 block mt-1">{score.correct} / {score.total}</span>
              <span className="text-[10px] text-gray-400 block mt-1">Chính xác {Math.round((score.correct / score.total) * 100)}%</span>
            </div>
          )}
        </aside>

        {/* --- VÙNG 2: NỘI DUNG TÀI LIỆU MEDIA (TRUNG TÂM - CHIẾM 40%) --- */}
        <section className="w-2/5 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto space-y-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tài liệu tham khảo bài học</h2>
          
          {/* Audio tổng từ Firestore */}
          {mediaData.audioUrl && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-gray-500 block">🔊 File âm thanh bài nghe:</span>
              <audio src={mediaData.audioUrl} controls className="w-full mt-1" />
            </div>
          )}

          {/* Hình ảnh tổng từ Firestore */}
          {mediaData.imageUrl && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-gray-500 block">🖼️ Hình ảnh minh họa:</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaData.imageUrl} alt="Quiz illustration" className="w-full h-auto rounded-lg object-contain border max-h-64 bg-gray-50" />
            </div>
          )}

          {/* Đoạn văn bản (đọc hiểu) bóc tách từ file Excel */}
          {questions[currentQuestionIndex]?.Reading_Text && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-blue-500 block">📝 Bài đọc hiểu (Đoạn văn):</span>
              <p className="text-sm text-gray-700 leading-relaxed font-normal whitespace-pre-line bg-gray-50 p-4 rounded-lg border border-dashed border-gray-200">
                {questions[currentQuestionIndex].Reading_Text}
              </p>
            </div>
          )}

          {!mediaData.audioUrl && !mediaData.imageUrl && !questions[currentQuestionIndex]?.Reading_Text && (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
              Bài tập này không yêu cầu tài liệu đính kèm.
            </div>
          )}
        </section>

        {/* --- VÙNG 3: NỘI DUNG CÂU HỎI TRẮC NGHIỆM (BÊN PHẢI - CHIẾM 40%) --- */}
        <main className="w-2/5 bg-white p-6 overflow-y-auto space-y-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nội dung câu hỏi luyện tập</h2>
          
          {questions.map((q, index) => (
            <div
              key={index}
              ref={(el) => (questionRefs.current[index] = el)}
              onFocus={() => setCurrentQuestionIndex(index)}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`p-5 rounded-xl border transition-all duration-200 scroll-mt-6
                ${currentQuestionIndex === index ? 'border-green-400 shadow-md bg-green-50/10' : 'border-gray-100 bg-white shadow-sm'}
              `}
            >
              <div className="flex items-start gap-2 mb-4">
                <span className="text-xs font-extrabold bg-gray-800 text-white px-2 py-0.5 rounded mt-0.5">
                  Câu {index + 1}
                </span>
                <p className="font-bold text-gray-800 text-base flex-1">{q.Question}</p>
              </div>

              {/* Các nút lựa chọn đáp án */}
              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const isSelected = userAnswers[index] === option;
                  return (
                    <button
                      key={option}
                      disabled={score !== null} 
                      onClick={() => handleSelectAnswer(index, option)}
                      className={`w-full text-left p-3.5 rounded-xl text-sm transition border flex items-center gap-3
                        ${isSelected 
                          ? 'bg-green-100 border-green-400 font-semibold text-green-800 shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        } ${score !== null ? 'cursor-not-allowed opacity-80' : ''}
                      `}
                    >
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-all
                        ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {option}
                      </span>
                      <span className="flex-1">{q[option]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </main>

      </div>
    </div>
  );
}