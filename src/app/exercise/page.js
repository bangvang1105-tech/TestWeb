'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/firebase'; 
import { doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse';

// Component con xử lý logic cho từng câu hỏi
function DictationItem({ row }) {
  const [userInput, setUserInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  
  const isCorrect = userInput.trim().toLowerCase() === row.correctanswer.trim().toLowerCase();

  return (
    <div className="p-6 border rounded-xl shadow-sm bg-white mb-6">
      <audio src={row.audiourl} controls className="w-full mb-4" />
      
      <textarea
        className="w-full p-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none mb-3"
        rows="2"
        placeholder="Nghe và chép lại câu vào đây..."
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={showResult}
      />

      {!showResult ? (
        <button 
          onClick={() => setShowResult(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
        >
          Kiểm tra
        </button>
      ) : (
        <div className={`mt-3 p-3 rounded-lg ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <p className="font-bold">{isCorrect ? "Chính xác! 🎉" : "Chưa đúng. Đáp án là:"}</p>
          <p className="font-mono text-sm">{row.correctanswer}</p>
          <button onClick={() => {setShowResult(false); setUserInput("");}} className="mt-2 text-xs underline">Làm lại</button>
        </div>
      )}
    </div>
  );
}

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error(`Không tìm thấy Document ID: "${partKey}" trong collection "exercise_lessons".`);
        }

        const url = docSnap.data().exerciseUrl;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Không thể tải file CSV từ Google Sheets.");
        
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results.data);
            setLoading(false);
          },
          error: (err) => {
            throw new Error("Lỗi đọc file: " + err.message);
          }
        });
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
    loadData();
  }, [partKey]);

  if (loading) return <div className="p-10 text-center">Đang nạp dữ liệu luyện nghe...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-bold">LỖI: {error}</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto bg-gray-50 min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-800 uppercase tracking-wider">{partKey.replace('_', ' ')}</h1>
        <button onClick={() => router.back()} className="text-sm font-bold text-gray-500">← Thoát</button>
      </header>

      {/* Render danh sách câu hỏi sử dụng Component con */}
      {data.map((row, index) => (
        <DictationItem key={index} row={row} />
      ))}
      
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Đang tải...</div>}><ExerciseContent /></Suspense>;
}