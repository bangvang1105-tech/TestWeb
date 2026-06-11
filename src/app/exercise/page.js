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
            complete: (results) => { setData(results.data.filter(r => r.audiourl)); setLoading(false); }
          });
        }
      } catch (err) { console.error(err); setLoading(false); }
    }
    loadData();
  }, [partKey]);

  // Hàm xử lý danh sách từ vựng
  const getVocabList = (vocabString) => {
    if (!vocabString) return [];
    return vocabString.split('|').map(item => {
      const [word, mean] = item.split(':');
      return { word: word.trim(), mean: mean.trim() };
    });
  };

  if (loading) return <div className="text-center py-20">Đang tải...</div>;
  const currentQ = data[currentIndex];
  const vocabList = getVocabList(currentQ?.vocabulary);

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Cột chính: Bài tập */}
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <header className="flex justify-between items-center mb-8">
            <button onClick={() => router.back()} className="text-sm text-gray-400 font-bold">← Thoát</button>
            <div className="text-xs font-black text-green-500 uppercase tracking-widest">CÂU {currentIndex + 1}/{data.length}</div>
          </header>

          <audio key={currentQ.audiourl} controls className="w-full h-10 mb-6"><source src={currentQ.audiourl} type="audio/mpeg" /></audio>

          <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
             <p className="text-gray-700 font-semibold text-lg">{currentQ.maskedsentence}</p>
             {currentQ.hint && <p className="text-xs text-green-600 mt-3">💡 Gợi ý: {currentQ.hint}</p>}
          </div>

          <textarea
            className="w-full p-4 rounded-2xl bg-white border-2 border-gray-100 mb-6 focus:border-green-400 outline-none transition-all text-sm" // Đã chỉnh chữ nhỏ hơn (text-sm)
            rows="3"
            placeholder="Gõ đáp án vào đây..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />

          {!showResult ? (
            <button onClick={() => setShowResult(true)} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600">Kiểm tra đáp án</button>
          ) : (
            <div className="space-y-4">
              <div className={`p-5 rounded-2xl ${userInput.trim().toLowerCase() === currentQ.correctanswer.trim().toLowerCase() ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-bold">{userInput.trim().toLowerCase() === currentQ.correctanswer.trim().toLowerCase() ? "Chính xác! 🎉" : "Chưa đúng."}</p>
              </div>
              <button onClick={() => { setUserInput(""); setShowResult(false); if(currentIndex < data.length-1) setCurrentIndex(currentIndex+1); }} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold">Câu tiếp theo →</button>
            </div>
          )}
        </div>

        {/* Cột phụ: Bảng từ vựng (Chỉ hiện khi đã kiểm tra đáp án) */}
        {showResult && vocabList.length > 0 && (
          <div className="w-full md:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
            <h3 className="font-bold text-green-600 mb-4 uppercase text-sm text-center">Danh sách từ vựng</h3>
            <table className="w-full text-sm">
              <tbody>
                {vocabList.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 font-bold">{item.word}</td>
                    <td className="py-2 text-gray-600">{item.mean}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Đang tải...</div>}><ExerciseContent /></Suspense>;
}