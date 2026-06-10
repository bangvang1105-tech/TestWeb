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
      const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
      if (docSnap.exists()) {
        const response = await fetch(docSnap.data().exerciseUrl);
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => { setData(results.data); setLoading(false); }
        });
      }
    }
    loadData();
  }, [partKey]);

  if (loading) return <div className="text-center mt-20">Đang chuẩn bị bài học...</div>;
  if (data.length === 0) return <div>Không có câu hỏi nào.</div>;

  const currentQ = data[currentIndex];

  const handleNext = () => {
    setUserInput("");
    setShowResult(false);
    if (currentIndex < data.length - 1) setCurrentIndex(currentIndex + 1);
    else alert("Hoàn thành bài học!");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <header className="flex justify-between items-center mb-8">
          <button onClick={() => router.back()} className="text-sm text-gray-400 font-bold">← Thoát</button>
          <div className="text-xs font-black text-green-500 uppercase">{partKey} | Câu {currentIndex + 1}/{data.length}</div>
        </header>

        <audio src={currentQ.audiourl} controls className="w-full mb-6" />

        {/* PHẦN ĐỤC LỖ DỰA VÀO MASKEDSENTENCE */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
           <p className="text-gray-700 font-medium mb-2">{currentQ.maskedsentence || "Lắng nghe và chép lại toàn bộ câu:"}</p>
           {currentQ.hint && <p className="text-xs text-green-600 italic">💡 Gợi ý: {currentQ.hint}</p>}
        </div>

        <textarea
          className="w-full p-4 rounded-xl bg-white border border-gray-200 mb-4 focus:ring-2 focus:ring-green-400 outline-none"
          rows="3"
          placeholder="Điền vào đây..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />

        {!showResult ? (
          <button onClick={() => setShowResult(true)} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold">Kiểm tra</button>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${userInput.toLowerCase() === currentQ.correctanswer.toLowerCase() ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="font-bold">{userInput.toLowerCase() === currentQ.correctanswer.toLowerCase() ? "Chính xác! 🎉" : "Chưa đúng."}</p>
              <p className="text-sm mt-1">Đáp án: {currentQ.correctanswer}</p>
            </div>
            <button onClick={handleNext} className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold">
              {currentIndex < data.length - 1 ? "Câu tiếp theo →" : "Kết thúc"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}