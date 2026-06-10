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
        // 1. Lấy dữ liệu từ Firestore
        const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
        if (!docSnap.exists()) throw new Error(`Không tìm thấy Document ID: ${partKey}`);

        const url = docSnap.data().exerciseUrl;
        
        // 2. Tải CSV từ Google Sheets (dùng link Published to web)
        const res = await fetch(url);
        if (!res.ok) throw new Error("Không thể tải file từ link, hãy kiểm tra lại quyền công khai!");
        
        const csvText = await res.text();
        const lines = csvText.split('\n');
        
        // 3. Xử lý dữ liệu dòng thứ 2 (dòng 1 là tiêu đề)
        if (lines.length < 2) throw new Error("File CSV rỗng hoặc chưa có dữ liệu!");
        const row = lines[1].split(',');
        
        // Cấu trúc tạm thời để test hiển thị
        setQ({ audio: row[1], meaning: row[2] });

      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [partKey]);

  if (loading) return <div>Đang kiểm tra dữ liệu...</div>;
  if (error) return <div className="text-red-500 font-bold p-10">LỖI: {error}</div>;

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-5">Bài tập: {partKey}</h1>
      <audio src={q.audio} controls className="mb-4" />
      <p className="text-lg">Nghĩa: {q.meaning}</p>
      <button onClick={() => router.back()} className="mt-5 p-3 bg-gray-200 rounded">Quay lại</button>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Đang tải...</div>}><ExerciseContent /></Suspense>;
}