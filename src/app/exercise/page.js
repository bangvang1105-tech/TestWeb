'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const roboto = Roboto({ weight: ['400', '500', '700', '900'], subsets: ['vietnamese'], display: 'swap' });

// Hàm parser: Tự động nhận diện cột kể cả khi có khoảng trắng
function parseExerciseCSV(csvText, partKey) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map((line, i) => {
    const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
    let obj = {};
    headers.forEach((h, idx) => obj[h] = row[idx]);
    
    // Xử lý dữ liệu Part 3, 4 phức tạp
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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const docRef = doc(db, 'exercise_lessons', partKey);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.error("Không tìm thấy document ID:", partKey);
          setQuestions([]);
          return;
        }
        
        const url = docSnap.data().exerciseUrl;
        const exportUrl = url.replace('/edit', '/export?format=csv');
        const response = await fetch(exportUrl);
        const csvText = await response.text();
        
        setQuestions(parseExerciseCSV(csvText, partKey));
      } catch (err) {
        console.error("Lỗi fetch:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [partKey]);

  const q = questions[currentIndex];

  const handleCheck = () => setIsCheck(true);

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput(''); setIsCheck(false);
    } else {
      alert('🎉 Hoàn thành!');
      router.push('/home');
    }
  };

  if (loading) return <div className="p-10 text-center">Đang tải bài tập...</div>;
  if (!q) return <div className="p-10 text-center text-red-500">Không tìm thấy câu hỏi nào! Hãy kiểm tra lại file Excel (đảm bảo đã công khai).</div>;

  return (
    <div className={`${roboto.className} min-h-screen bg-gray-50 p-6`}>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-sm">
        <header className="flex justify-between mb-6">
          <button onClick={() => router.back()} className="text-sm font-bold text-gray-400">← Thoát</button>
          <h1 className="font-black text-green-500 uppercase">{partKey}</h1>
        </header>

        <audio src={q.audiourl} controls className="w-full mb-4" key={q.audiourl} autoPlay />
        
        {q.isParagraphMode ? (
          <div className="bg-gray-50 p-4 rounded-xl mb-4">
            {q.scriptParagraphs.map((s, i) => s.isGap ? (
              <input key={i} className="m-1 p-1 border rounded" disabled={isCheck} 
                     onChange={(e) => setParagraphInputs(p => ({...p, [i]: e.target.value}))} />
            ) : <span key={i}>{s.text}</span>)}
          </div>
        ) : (
          <textarea className="w-full p-4 border rounded-xl mb-4" rows={3} value={userInput} 
                    onChange={(e) => setUserInput(e.target.value)} disabled={isCheck} />
        )}

        <button onClick={!isCheck ? handleCheck : handleNext} className="w-full bg-green-500 text-white p-4 rounded-xl font-bold">
          {!isCheck ? 'Kiểm tra' : (currentIndex === questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo')}
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><ExerciseContent /></Suspense>;
}