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
  const [loading, setLoading] = useState(true);

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
              // Chỉ lấy những dòng có link audio để không bị lỗi
              const validData = results.data.filter(row => row.audiourl && row.audiourl.trim() !== "");
              setData(validData); 
              setLoading(false); 
            }
          });
        }
      } catch (err) { 
        console.error(err); 
        setLoading(false); 
      }
    }
    loadData();
  }, [partKey]);

  if (loading) return <div className="p-20 text-center">Đang tải dữ liệu...</div>;
  if (data.length === 0) return <div className="p-20 text-center text-red-500">Chưa có link audio nào trong CSV!</div>;

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-xl mx-auto p-8 rounded-2xl shadow-xl border">
        <h2 className="text-xl font-bold mb-6 text-green-600">Test Audio Câu 1:</h2>
        
        {/* Bộ phát nhạc */}
        <div className="mb-6">
          <audio 
            key={data[0].audiourl} 
            controls 
            className="w-full h-12 shadow-md rounded-lg"
          >
            <source src={data[0].audiourl} type="audio/mpeg" />
            Trình duyệt không hỗ trợ file này.
          </audio>
        </div>
        
        <p className="font-bold text-gray-800">Nội dung câu hỏi: {data[0].maskedsentence}</p>
        <button 
          onClick={() => router.back()} 
          className="mt-8 text-gray-400 font-bold"
        >
          ← Quay lại
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><ExerciseContent /></Suspense>;
}