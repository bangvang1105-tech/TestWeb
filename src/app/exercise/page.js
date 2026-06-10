'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

function ExerciseContent() {
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Lấy dữ liệu từ Firestore
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error("Không tìm thấy bài tập với ID: " + partKey);
        }

        const exerciseUrl = docSnap.data().exerciseUrl;
        console.log("Đã tìm thấy link bài tập:", exerciseUrl);
        setData({ partKey, ...docSnap.data() });
      } catch (err) {
        setError(err.message);
        console.error("Lỗi:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [partKey]);

  if (loading) return <div>Đang nạp dữ liệu...</div>;
  if (error) return <div style={{color: 'red'}}>Lỗi: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Bài tập: {data.partKey}</h1>
      <p>Link bài tập: {data.exerciseUrl}</p>
      {/* Thêm phần render bài tập của bạn ở đây */}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><ExerciseContent /></Suspense>;
}