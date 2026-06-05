'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Roboto } from 'next/font/google';

// Đường dẫn chính xác: Từ src/app/home/quiz/[id]/ ra 4 cấp thư mục sẽ gặp file firebase.js
import { db } from '../../../../firebase'; 
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
        
        const docRef = doc(db, "lessons", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          throw new Error(`Không tìm thấy dữ liệu "${id}" trên Firebase.`);
        }

        const dataFromFirestore = docSnap.data();
        const driveLink = dataFromFirestore.drive_link;
        
        setMediaData({
          imageUrl: dataFromFirestore.image_url || '',
          audioUrl: dataFromFirestore.audio_url || ''
        });

        if (!driveLink) {
          throw new Error("Chưa cấu hình link Excel trên Firebase.");
        }

        const sheetId = driveLink.match(/\/d\/([^/]+)/)?.[1];
        if (!sheetId) throw new Error("Link Drive không hợp lệ.");
        const downloadUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("Không thể tải file Excel. Hãy kiểm tra quyền chia sẻ.");
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setQuestions(jsonData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
        setLoading(false);
      }
    }

    if (id) fetchFullQuizData();
  }, [id]);

  const scrollToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSelectAnswer = (qIndex, option) => {
    setUserAnswers({ ...userAnswers, [qIndex]: option });
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (userAnswers[index] === String(q.Correct).trim()) correctCount++;
    });
    setScore({ correct: correctCount, total: questions.length });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
  if (errorMsg) return <div className="p-8 text-center text-red-600">{errorMsg}</div>;

  return (
    <div className={`h-screen flex flex-col bg-gray-100 ${roboto.className}`}>
      <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
        <span className="font-bold text-sm bg-gray-100 px-3 py-1 rounded-lg">Mã bài: {id}</span>
        {score === null ? (
          <button onClick={handleSubmitQuiz} style={{ backgroundColor: BRAND }} className="text-white px-6 py-2 rounded-lg font-bold text-sm">Nộp bài</button>
        ) : (
          <button onClick={() => router.push('/home')} className="text-sm font-medium text-gray-500">Thoát</button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/5 bg-white border-r p-4 overflow-y-auto">
          <h2 className="text-xs font-bold text-gray-400 mb-4">BẢNG TIẾN ĐỘ</h2>
          <div className="grid grid-cols-4 gap-2">
            {questions.map((_, index) => (
              <button key={index} onClick={() => scrollToQuestion(index)} 
                className={`h-10 rounded-lg text-xs font-bold border ${currentQuestionIndex === index ? 'border-2' : ''} ${userAnswers[index] ? 'text-white' : 'text-gray-600'}`}
                style={{ borderColor: currentQuestionIndex === index ? BRAND : 'transparent', backgroundColor: userAnswers[index] ? BRAND : '#f3f4f6' }}>
                {index + 1}
              </button>
            ))}
          </div>
        </aside>

        <section className="w-2/5 bg-gray-50 border-r p-6 overflow-y-auto space-y-6">
          {mediaData.audioUrl && <div className="bg-white p-4 rounded-xl border"><audio src={mediaData.audioUrl} controls className="w-full" /></div>}
          {mediaData.imageUrl && <div className="bg-white p-4 rounded-xl border"><img src={mediaData.imageUrl} alt="Ref" className="w-full rounded" /></div>}
          {questions[currentQuestionIndex]?.Reading_Text && (
            <div className="bg-white p-5 rounded-xl border"><p className="whitespace-pre-line text-sm text-gray-700">{questions[currentQuestionIndex].Reading_Text}</p></div>
          )}
        </section>

        <main className="w-2/5 bg-white p-6 overflow-y-auto space-y-8">
          {questions.map((q, index) => (
            <div key={index} ref={(el) => (questionRefs.current[index] = el)} onClick={() => setCurrentQuestionIndex(index)}
              className={`p-5 rounded-xl border ${currentQuestionIndex === index ? 'border-green-400 bg-green-50' : 'border-gray-100'}`}>
              <p className="font-bold mb-4">Câu {index + 1}: {q.Question}</p>
              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <button key={opt} disabled={score !== null} onClick={() => handleSelectAnswer(index, opt)}
                    className={`w-full text-left p-3 rounded-xl text-sm border ${userAnswers[index] === opt ? 'bg-green-100 border-green-400' : 'border-gray-200'}`}>
                    {opt}: {q[opt]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}