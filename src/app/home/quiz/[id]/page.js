'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Roboto } from 'next/font/google';

// ĐƯỜNG DẪN ĐÃ SỬA: Import từ file firebase.js nằm trong thư mục src
import { db } from '../../../firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const BRAND = '#4ade80';

export default function AdvancedQuizPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [questions, setQuestions] = useState([]);
  const [mediaData, setMediaData] = useState({ imageUrl: '', audioUrl: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [userAnswers, setUserAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(null);

  const questionRefs = useRef([]);

  useEffect(() => {
    async function fetchFullQuizData() {
      try {
        setLoading(true);
        
        // Kiểm tra xem db có tồn tại không
        if (!db) throw new Error("Không thể kết nối Firebase.");

        const docRef = doc(db, "lessons", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) throw new Error(`Không tìm thấy bài học "${id}".`);

        const data = docSnap.data();
        setMediaData({ imageUrl: data.image_url || '', audioUrl: data.audio_url || '' });

        if (!data.drive_link) throw new Error("Link Excel chưa được cấu hình.");

        const sheetId = data.drive_link.match(/\/d\/([^/]+)/)?.[1];
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`);
        const buffer = await res.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setQuestions(XLSX.utils.sheet_to_json(ws));
        setLoading(false);
      } catch (err) {
        setErrorMsg(err.message);
        setLoading(false);
      }
    }
    if (id) fetchFullQuizData();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;
  if (errorMsg) return <div className="p-10 text-center text-red-500">{errorMsg}</div>;

  return (
    <div className={`h-screen flex flex-col bg-gray-100 ${roboto.className}`}>
      <header className="h-14 bg-white border-b px-6 flex items-center justify-between">
        <span className="font-bold text-sm">Bài: {id}</span>
        {score === null ? (
          <button onClick={() => {
            let c = 0;
            questions.forEach((q, i) => { if(userAnswers[i] === String(q.Correct).trim()) c++; });
            setScore({ correct: c, total: questions.length });
          }} style={{ backgroundColor: BRAND }} className="text-white px-4 py-1.5 rounded text-sm font-bold">Nộp bài</button>
        ) : <button onClick={() => router.push('/home')} className="text-sm">Thoát</button>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/5 bg-white border-r p-4 overflow-y-auto">
          <div className="grid grid-cols-4 gap-2">
            {questions.map((_, i) => (
              <button key={i} onClick={() => { setCurrentQuestionIndex(i); questionRefs.current[i]?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`h-8 rounded ${userAnswers[i] ? 'text-white' : 'text-gray-600'}`}
                style={{ backgroundColor: userAnswers[i] ? BRAND : '#f3f4f6' }}>{i+1}</button>
            ))}
          </div>
        </aside>

        <section className="w-2/5 p-6 overflow-y-auto space-y-4">
          {mediaData.audioUrl && <audio src={mediaData.audioUrl} controls className="w-full" />}
          {mediaData.imageUrl && <img src={mediaData.imageUrl} className="w-full rounded" />}
          {questions[currentQuestionIndex]?.Reading_Text && <p className="whitespace-pre-line text-sm bg-white p-4 rounded">{questions[currentQuestionIndex].Reading_Text}</p>}
        </section>

        <main className="w-2/5 p-6 overflow-y-auto">
          {questions.map((q, i) => (
            <div key={i} ref={(el) => (questionRefs.current[i] = el)} className="mb-6 bg-white p-4 rounded border">
              <p className="font-bold mb-3">{i+1}. {q.Question}</p>
              {['A', 'B', 'C', 'D'].map((opt) => (
                <button key={opt} onClick={() => setUserAnswers({...userAnswers, [i]: opt})}
                  className={`w-full text-left p-2 mb-1 rounded border ${userAnswers[i] === opt ? 'bg-green-100 border-green-400' : ''}`}>
                  {opt}: {q[opt]}
                </button>
              ))}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}