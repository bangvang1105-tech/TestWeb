'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';

  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        // 1. Lấy URL từ Firestore
        const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
        if (!docSnap.exists()) throw new Error("Document không tồn tại!");
        
        const url = docSnap.data().exerciseUrl;
        const exportUrl = url.replace('/edit', '/export?format=csv');
        
        // 2. Fetch dữ liệu
        const res = await fetch(exportUrl);
        const csvText = await res.text();
        
        // 3. Parser đơn giản (Kiểm tra xem dòng 2 có dữ liệu không)
        const lines = csvText.split('\n');
        if (lines.length < 2) throw new Error("File CSV rỗng!");
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const values = lines[1].split(',');

        // Map dữ liệu dựa trên tiêu đề cột
        const data = {};
        headers.forEach((h, i) => data[h] = values[i]);
        
        console.log("Dữ liệu đã parse:", data);
        setQ({ audio: data.audiourl, meaning: data.meaning });

      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [partKey]);

  if (loading) return <div>Đang nạp dữ liệu từ Drive...</div>;
  if (error) return <div className="text-red-500">LỖI: {error}</div>;
  if (!q || !q.audio) return <div>Không tìm thấy dữ liệu bài tập! Hãy kiểm tra lại file Excel (cột audiourl).</div>;

  return (
    <div className="p-10 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Bài tập: {partKey}</h1>
      <audio src={q.audio} controls className="mb-4 bg-white rounded-lg p-2" />
      <p className="text-lg">Nghĩa: {q.meaning}</p>
      <button onClick={() => router.back()} className="mt-5 p-3 bg-green-500 rounded text-white font-bold">Quay lại</button>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><ExerciseContent /></Suspense>;
}