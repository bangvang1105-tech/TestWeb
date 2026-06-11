'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse';

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';
  
  const [data, setData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
        if (docSnap.exists()) {
          const response = await fetch(docSnap.data().exerciseUrl);
          const csvText = await response.text();
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => { 
              // Lọc chỉ lấy các dòng có dữ liệu hợp lệ
              setData(results.data.filter(r => r.audiourl)); 
              setLoading(false); 
            }
          });
        }
      } catch (err) { console.error(err); setLoading(false); }
    }
    loadData();
  }, [partKey]);

  if (loading) return <div className="text-center py-20">Đang tải...</div>;
  if (data.length === 0) return <div className="text-center py-20">Dữ liệu trống hoặc link audio chưa chuẩn!</div>;

  const currentQ = data[currentIndex];

  const handleNext = () => {
    setUserInput("");
    setShowResult(false);
    if (currentIndex < data.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert("Chúc mừng! Bạn đã hoàn thành toàn bộ bài tập!");
    }
  };

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-xl mx-auto p-8 rounded-2xl shadow-xl border border-gray-100 bg-white">
        <header className="flex justify-between items-center mb-8">
          <button onClick={() => router.back()} className="text-sm text-gray-400 font-bold hover:text-gray-600">← Thoát</button>
          <div className="text-xs font-black text-green-500 uppercase tracking-widest">
            {partKey.replace('_', ' ')} | Câu {currentIndex + 1}/{data.length}
          </div>
        </header>

        {/* Audio Player */}
        <div className="mb-8">
          <audio key={currentQ.audiourl} controls className="w-full h-12 shadow-sm rounded-lg">
            <source src={currentQ.audiourl} type="audio/mpeg" />
            Trình duyệt của bạn không hỗ trợ file này.
          </audio>
        </div>

        {/* Phần hiển thị câu hỏi và gợi ý */}
        <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
           <p className="text-gray-700 font-semibold text-lg">{currentQ.maskedsentence || "Lắng nghe câu và nhập đáp án:"}</p>
           {currentQ.hint && <p className="text-xs text-green-600 mt-3 font-medium">💡 Gợi ý: {currentQ.hint}</p>}
        </div>

        <textarea
          className="w-full p-4 rounded-2xl bg-white border-2 border-gray-100 mb-6 focus:border-green-400 outline-none transition-all"
          rows="3"
          placeholder="Gõ nội dung bạn nghe được tại đây..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />

        {!showResult ? (
          <button onClick={() => setShowResult(true)} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition shadow-lg">Kiểm tra đáp án</button>
        ) : (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl ${userInput.trim().toLowerCase() === currentQ.correctanswer.trim().toLowerCase() ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <p className="font-bold">{userInput.trim().toLowerCase() === currentQ.correctanswer.trim().toLowerCase() ? "Chính xác! 🎉" : "Chưa đúng."}</p>
              <p className="text-sm mt-1">Đáp án: <span className="font-mono font-bold">{currentQ.correctanswer}</span></p>
            </div>
            <button onClick={handleNext} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition">
              {currentIndex < data.length - 1 ? "Câu tiếp theo →" : "Hoàn thành bài tập"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Đang tải...</div>}><ExerciseContent /></Suspense>;
}