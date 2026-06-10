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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Kiểm tra Firestore
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.error("LỖI: Không tìm thấy document ID:", partKey, "trong collection 'exercise_lessons'");
          return;
        }

        const data = docSnap.data();
        console.log("Dữ liệu Firestore:", data);

        // 2. Chuyển đổi link
        const url = data.exerciseUrl;
        const exportUrl = url.replace('/edit', '/export?format=csv');
        
        const response = await fetch(exportUrl);
        const csvText = await response.text();
        
        // 3. Tạm thời lấy dòng đầu tiên để test
        const lines = csvText.split('\n');
        console.log("CSV đã tải về thành công, số dòng:", lines.length);
        
        setQ({
            audioUrl: lines[1]?.split(',')[1], // Giả định cột 2 là audioUrl
            meaning: lines[1]?.split(',')[2]   // Giả định cột 3 là meaning
        });

      } catch (err) {
        console.error("Lỗi chi tiết:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [partKey]);

  if (loading) return <div>Đang nạp dữ liệu... Hãy kiểm tra F12 Console để xem lỗi!</div>;
  if (!q) return <div>Không tìm thấy dữ liệu. Hãy xem log ở F12 (Console) để biết lỗi tại Firestore hay tại Link Google Sheet.</div>;

  return (
    <div className="p-10">
      <h1>Đang học: {partKey}</h1>
      <audio src={q.audioUrl} controls />
      <p>{q.meaning}</p>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><ExerciseContent /></Suspense>;
}