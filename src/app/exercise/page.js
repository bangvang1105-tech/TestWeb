'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/firebase'; // Đảm bảo đường dẫn này đúng với file firebase.js của bạn
import { doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse';

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
        // 1. Lấy URL bài tập từ Firestore
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error(`Không tìm thấy Document ID: "${partKey}" trong collection "exercise_lessons".`);
        }

        const url = docSnap.data().exerciseUrl;
        
        // 2. Fetch dữ liệu từ link CSV
        const response = await fetch(url);
        if (!response.ok) throw new Error("Không thể tải file CSV từ Google Sheets.");
        
        const csvText = await response.text();
        
        // 3. Parse dữ liệu
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

  if (loading) return <div className="p-10 text-center">Đang nạp dữ liệu...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-bold">LỖI: {error}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 uppercase">Bài tập: {partKey}</h1>
      <div className="grid gap-4">
        {data.map((row, index) => (
          <div key={index} className="p-4 border rounded-lg shadow-sm">
            <p><strong>Câu hỏi:</strong> {row.maskedsentence}</p>
            <p><strong>Đáp án:</strong> {row.correctanswer}</p>
            <audio src={row.audiourl} controls className="mt-2 w-full" />
          </div>
        ))}
      </div>
      <button onClick={() => router.back()} className="mt-6 px-4 py-2 bg-gray-200 rounded">Quay lại</button>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Đang tải...</div>}><ExerciseContent /></Suspense>;
}