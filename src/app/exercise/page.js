'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const roboto = Roboto({ weight: ['400', '500', '700', '900'], subsets: ['vietnamese'], display: 'swap' });

function parseExerciseCSV(csvText, partKey) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map((line, i) => {
    const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
    let obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx]);
    
    // Xử lý đục lỗ cho Part 3, 4
    if (partKey.includes('p3') || partKey.includes('p4')) {
      const rawScript = obj['scripttext'] || '';
      const parts = rawScript.split(/(\[.+?\|.+?\])/g);
      obj.isParagraphMode = true;
      obj.scriptParagraphs = parts.map(token => {
        if (token.startsWith('[') && token.endsWith(']')) {
          const [correctAnswer, hint] = token.slice(1, -1).split('|');
          return { isGap: true, correctAnswer, hint };
        }
        return { isGap: false, text: token };
      });
    }
    return obj;
  });
}

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [paragraphInputs, setParagraphInputs] = useState({});
  const [isCheck, setIsCheck] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErrorMessage(null);
      try {
        // 1. Kiểm tra Firebase
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          throw new Error(`Không tìm thấy Document ID: "${partKey}" trong Collection "exercise_lessons" trên Firebase.`);
        }
        
        const url = docSnap.data().exerciseUrl;
        if (!url) throw new Error("Document tồn tại nhưng không có field 'exerciseUrl'.");
        
        // 2. Tải CSV
        const exportUrl = url.replace('/edit', '/export?format=csv');
        const response = await fetch(exportUrl);
        if (!response.ok) throw new Error("Không thể tải file CSV. Hãy kiểm tra Link Google Sheet (Phải Public).");
        
        const csvText = await response.text();
        const data = parseExerciseCSV(csvText, partKey);
        
        if (data.length === 0) throw new Error("Dữ liệu CSV rỗng hoặc tiêu đề cột không khớp!");
        
        setQuestions(data);
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [partKey]);

  // UI RENDERING
  if (loading) return <div className="p-10 text-center font-bold text-green-500">Đang đồng bộ dữ liệu...</div>;
  if (errorMessage) return (
    <div className="p-10 text-center text-red-500 font-bold border border-red-200 bg-red-50 m-4 rounded-xl">
      <p className="mb-4">⚠️ LỖI: {errorMessage}</p>
      <button onClick={() => router.back()} className="p-2 px-4 bg-gray-200 rounded-lg">Quay lại</button>
    </div>
  );

  const q = questions[currentIndex];

  return (
    <div className={`${roboto.className} min-h-screen bg-gray-50 p-6`}>
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-lg">
        <h2 className="text-xl font-black text-green-500 mb-6 uppercase">{partKey}</h2>
        <audio src={q.audiourl} controls className="w-full mb-4" key={q.audiourl} />
        
        {/* Nội dung bài tập */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl text-sm">
           {q.isParagraphMode ? "Đoạn văn cần điền từ..." : q.meaning}
        </div>

        {/* Ô nhập liệu */}
        <textarea className="w-full p-4 border rounded-xl mb-4" rows={3} value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} />

        <button onClick={() => alert("Tính năng kiểm tra đã sẵn sàng!")} className="w-full bg-green-500 text-white p-4 rounded-xl font-bold">
          Kiểm tra đáp án
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><ExerciseContent /></Suspense>;
}