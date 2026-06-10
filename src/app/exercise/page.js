'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

// Hàm parser chuyên sâu: Xử lý file CSV từ Drive thành cấu trúc bài tập linh hoạt
function parseExerciseCSV(csvText, partKey) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  
  const idxId = headers.indexOf('id');
  const idxAudio = headers.indexOf('audiourl');
  const idxMeaning = headers.indexOf('meaning');
  const idxAnswer = headers.indexOf('correctanswer');
  const idxMasked = headers.indexOf('maskedsentence');
  const idxHint = headers.indexOf('hint');
  const idxScript = headers.indexOf('scripttext');

  return lines.slice(1).map((line, i) => {
    const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
    
    const idVal = row[idxId] || i + 1;
    const audioUrlVal = row[idxAudio];
    const meaningVal = row[idxMeaning];

    // Cấu trúc cho Part 1 & 2
    if (partKey === 'dictation_p1' || partKey === 'dictation_p2') {
      return {
        id: idVal,
        audioUrl: audioUrlVal,
        meaning: meaningVal,
        correctAnswer: row[idxAnswer],
        maskedSentence: idxMasked !== -1 ? row[idxMasked] : '',
        hint: idxHint !== -1 ? row[idxHint] : '',
        isParagraphMode: false
      };
    } 
    // Cấu trúc cho Part 3 & 4 (Parser đoạn văn)
    else {
      const rawScript = idxScript !== -1 ? row[idxScript] : '';
      const scriptParagraphs = [];
      const regex = /(\[.+?\|.+?\])/g;
      const parts = rawScript.split(regex);
      
      let currentSpeaker = 'Speaker';
      let gapCounter = 0;

      parts.forEach((token) => {
        if (!token) return;
        if (token.startsWith('[') && token.endsWith(']')) {
          const [correctAnswer, hintText] = token.slice(1, -1).split('|');
          scriptParagraphs.push({ speaker: currentSpeaker, isGap: true, gapId: gapCounter++, correctAnswer, hint: hintText });
        } else {
          const speakerMatch = token.match(/^([A-Z0-9\s]+):/);
          if (speakerMatch) { currentSpeaker = speakerMatch[1].trim(); token = token.substring(speakerMatch[0].length); }
          scriptParagraphs.push({ speaker: currentSpeaker, isGap: false, text: token });
        }
      });

      return { id: idVal, audioUrl: audioUrlVal, meaning: meaningVal, isParagraphMode: true, scriptParagraphs };
    }
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
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
        if (!docSnap.exists()) throw new Error("Cấu hình bài tập chưa sẵn sàng!");
        
        const url = docSnap.data().exerciseUrl;
        const exportUrl = url.includes('/edit') ? url.replace('/edit', '/export?format=csv') : url;
        const response = await fetch(exportUrl);
        const csvText = await response.text();
        
        setQuestions(parseExerciseCSV(csvText, partKey));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [partKey]);

  const cleanStr = (str) => str?.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").replace(/\s+/g, " ").trim() || '';

  const handleCheck = () => {
    const q = questions[currentIndex];
    if (q.isParagraphMode) {
      const allCorrect = q.scriptParagraphs.filter(p => p.isGap).every(gap => cleanStr(paragraphInputs[gap.gapId]) === cleanStr(gap.correctAnswer));
      setIsCorrect(allCorrect);
    } else {
      setIsCorrect(cleanStr(userInput) === cleanStr(q.correctAnswer));
    }
    setIsCheck(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setParagraphInputs({});
      setIsCheck(false);
      setShowHint(false);
    } else {
      if (CURRENT_USER_ID) {
        await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', `exercise_${partKey}`), { status: 'completed', updatedAt: new Date().toISOString() }, { merge: true });
      }
      alert('🎉 Hoàn thành bài tập!');
      router.push('/home');
    }
  };

  if (loading) return <div className="p-10 text-center text-green-500 font-bold">Đang tải học liệu...</div>;
  if (questions.length === 0) return <div className="p-10 text-center text-gray-400">Không có dữ liệu bài tập!</div>;

  const q = questions[currentIndex];

  return (
    <div className={`${roboto.className} min-h-screen bg-gray-50 p-4`}>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl shadow-lg">
        <header className="flex justify-between mb-6">
          <button onClick={() => router.back()} className="text-sm font-bold text-gray-400">← Thoát</button>
          <span className="text-green-500 font-black uppercase text-xs tracking-widest">{partKey}</span>
        </header>

        <audio src={q.audioUrl} controls className="w-full mb-6" key={q.audioUrl} autoPlay />
        <p className="text-gray-600 italic mb-6 text-sm">Gợi ý: {q.meaning}</p>
        
        {/* Render UI dựa trên chế độ Paragraph (Part 3,4) hoặc Phẳng (Part 1,2) */}
        {q.isParagraphMode ? (
           <div className="bg-gray-50 p-4 rounded-2xl mb-6 text-sm leading-relaxed">
             {q.scriptParagraphs.map((s, i) => s.isGap ? (
               <input key={i} className={`m-1 p-1 rounded border text-center ${isCheck ? (cleanStr(paragraphInputs[s.gapId]) === cleanStr(s.correctAnswer) ? 'bg-green-100' : 'bg-red-100') : 'bg-white'}`} 
                      disabled={isCheck} onChange={(e) => setParagraphInputs(prev => ({...prev, [s.gapId]: e.target.value}))} />
             ) : <span key={i}>{s.text}</span>)}
           </div>
        ) : (
          <textarea className="w-full p-4 border rounded-2xl mb-4" rows={3} value={userInput} onChange={(e) => setUserInput(e.target.value)} disabled={isCheck} />
        )}

        {isCheck && <div className={`p-4 mb-4 rounded-xl font-bold ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isCorrect ? 'Chính xác!' : `Sai rồi! Đáp án: ${q.correctAnswer || q.scriptParagraphs.map(p=>p.correctAnswer).filter(Boolean).join(', ')}`}</div>}

        <button onClick={!isCheck ? handleCheck : handleNext} className="w-full bg-green-400 text-white p-4 rounded-xl font-bold">
          {!isCheck ? 'Kiểm tra' : (currentIndex === questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo')}
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><ExerciseContent /></Suspense>;
}