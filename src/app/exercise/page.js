'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse'; // Cần chạy: npm install papaparse

function ExerciseContent() {
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';
  
  const [exerciseData, setExerciseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      try {
        // 1. Lấy URL từ Firestore
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error("Không tìm thấy cấu hình bài tập cho: " + partKey);
        }

        const csvUrl = docSnap.data().exerciseUrl;

        // 2. Tải và Parse file CSV
        const response = await fetch(csvUrl);
        const reader = response.body.getReader();
        const result = await new ReadableStream({
          start(controller) {
            return pump();
            function pump() {
              return reader.read().then(({ done, value }) => {
                if (done) { controller.close(); return; }
                controller.enqueue(value);
                return pump();
              });
            }
          }
        });

        const csvText = await new Response(result).text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setExerciseData(results.data);
            setLoading(false);
          },
          error: (err) => {
            throw new Error("Lỗi khi đọc file CSV: " + err.message);
          }
        });

      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    loadAllData();
  }, [partKey]);

  if (loading) return <div style={{textAlign: 'center', marginTop: '50px'}}>Đang tải bài tập, vui lòng đợi...</div>;
  if (error) return <div style={{color: 'red', padding: '20px'}}>Lỗi: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Danh sách câu hỏi: {partKey}</h1>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Câu hỏi</th>
            <th>Đáp án</th>
          </tr>
        </thead>
        <tbody>
          {exerciseData.map((row, index) => (
            <tr key={index}>
              <td>{row.id}</td>
              <td>{row.maskedsentence}</td>
              <td>{row.correctanswer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <ExerciseContent />
    </Suspense>
  );
}