'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse';

// Component con xử lý giao diện cho Part 1 (Gõ cả câu)
const Part1UI = ({ data }) => (
  <div className="p-4">
    <h2>Chép chính tả Part 1</h2>
    <audio controls src={data.audiourl} className="w-full mb-4" />
    <textarea className="w-full h-32 p-2 border" placeholder="Gõ câu bạn nghe được..." />
  </div>
);

// Component con xử lý giao diện cho Part 3 & 4 (Đục lỗ - Cloze Test)
const Part34UI = ({ data }) => (
  <div className="p-4">
    <h2>Điền vào chỗ trống</h2>
    <audio controls src={data.audiourl} className="w-full mb-4" />
    <p className="text-lg leading-loose">{data.maskedsentence}</p>
    <input className="border-b-2 border-black mt-2" placeholder="Đáp án..." />
  </div>
);

function ExerciseContent() {
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1'; // Mặc định là p1
  
  const [exerciseData, setExerciseData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const csvUrl = docSnap.data().exerciseUrl;
          const response = await fetch(csvUrl);
          const csvText = await response.text();
          
          Papa.parse(csvText, {
            header: true,
            complete: (results) => setExerciseData(results.data),
          });
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    loadData();
  }, [partKey]);

  if (loading) return <div>Đang tải bài tập...</div>;

  return (
    <div className="container mx-auto">
      {exerciseData.map((item, index) => (
        <div key={index} className="mb-10 p-6 shadow-lg rounded-xl">
          {/* Tự động chọn giao diện dựa trên PartKey */}
          {partKey.includes('p1') ? <Part1UI data={item} /> : <Part34UI data={item} />}
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Đang tải...</div>}><ExerciseContent /></Suspense>;
}