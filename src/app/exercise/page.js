'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse';

function ExerciseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partKey = searchParams.get('part') || 'dictation_p1';
  
  const [data, setData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  // State cho giao diện Part 1
  const [userInput, setUserInput] = useState("");

  // State cho giao diện Part 2
  const [inputQ, setInputQ] = useState("");
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [inputC, setInputC] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'exercise_lessons', partKey));
        if (docSnap.exists()) {
          const response = await fetch(docSnap.data().exerciseUrl);
          const csvText = await response.text();
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => { 
              setData(results.data.filter(r => r.audiourl)); 
              setLoading(false); 
            }
          });
        }
      } catch (err) { console.error(err); setLoading(false); }
    }
    loadData();
  }, [partKey]);

  // Hàm xử lý danh sách từ vựng
  const getVocabList = (vocabString) => {
    if (!vocabString) return [];
    return vocabString.split('|').map(item => {
      const [word, mean] = item.split(':');
      return { word: word?.trim(), mean: mean?.trim() };
    });
  };

  if (loading) return <div className="text-center py-20 font-bold text-gray-500">Đang tải dữ liệu...</div>;
  if (data.length === 0) return <div className="text-center py-20 text-red-500">Không có dữ liệu! Vui lòng kiểm tra lại link CSV.</div>;

  const currentQ = data[currentIndex];
  const vocabList = getVocabList(currentQ?.vocabulary);
  
  // LOGIC THÔNG MINH: Nhận diện xem đây là Part 1 hay Part 2
  const isPart2 = currentQ.hasOwnProperty('optionA');

  const handleNext = () => {
    // Reset toàn bộ các ô chữ khi qua câu mới
    setUserInput("");
    setInputQ(""); setInputA(""); setInputB(""); setInputC("");
    setShowResult(false);
    
    if (currentIndex < data.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert("🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập!");
    }
  };

  // Component nhỏ vẽ ô nhập liệu cho Part 2
  const InputRow = ({ label, value, setValue, answer }) => {
    const checkMatch = (val, ans) => val.trim().toLowerCase() === (ans || "").trim().toLowerCase();
    const isCorrect = showResult && checkMatch(value, answer);
    const isWrong = showResult && !checkMatch(value, answer);

    return (
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className={`font-bold text-lg w-6 ${label === 'Q' ? 'text-blue-600' : 'text-gray-600'}`}>{label}.</span>
          <input
            type="text"
            className={`flex-1 p-3 rounded-xl border-2 outline-none transition-all font-medium text-gray-900 
              ${!showResult ? 'bg-white border-gray-200 focus:border-blue-400' : ''}
              ${isCorrect ? 'bg-green-50 border-green-400 text-green-700' : ''}
              ${isWrong ? 'bg-red-50 border-red-400 text-red-700' : ''}
            `}
            placeholder={`Chép nội dung ${label === 'Q' ? 'câu hỏi' : 'đáp án ' + label}...`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={showResult}
          />
        </div>
        {isWrong && (
          <p className="text-sm text-red-600 mt-1 ml-9">
            Đáp án đúng: <span className="font-bold">{answer}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* CỘT CHÍNH: BÀI TẬP */}
        <div className="flex-1 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <header className="flex justify-between items-center mb-6">
            <button onClick={() => router.back()} className="text-sm text-gray-400 font-bold hover:text-gray-600">← Thoát</button>
            <div className={`text-xs font-black uppercase tracking-widest ${isPart2 ? 'text-blue-500' : 'text-green-500'}`}>
              {isPart2 ? 'PART 2' : 'PART 1'} | CÂU {currentIndex + 1}/{data.length}
            </div>
          </header>

          <audio key={currentQ.audiourl} controls className="w-full h-12 mb-8 shadow-sm rounded-lg">
            <source src={currentQ.audiourl} type="audio/mpeg" />
          </audio>

          {/* RENDER GIAO DIỆN THEO LOẠI BÀI */}
          {!isPart2 ? (
            /* --- KHU VỰC GIAO DIỆN PART 1 --- */
            <>
              <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                 <p className="text-gray-700 font-semibold text-lg">{currentQ.maskedsentence}</p>
                 {currentQ.hint && <p className="text-xs text-green-600 mt-3">💡 Gợi ý: {currentQ.hint}</p>}
              </div>
              <textarea
                className="w-full p-4 rounded-2xl bg-white border-2 border-gray-200 mb-6 focus:border-green-400 outline-none transition-all text-sm font-medium text-gray-900 placeholder-gray-400" 
                rows="3"
                placeholder="Gõ đáp án vào đây..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={showResult}
              />
              {!showResult ? (
                <button onClick={() => setShowResult(true)} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition shadow-lg">Kiểm tra đáp án</button>
              ) : (
                <div className="space-y-4">
                  <div className={`p-5 rounded-2xl ${userInput.trim().toLowerCase() === currentQ.correctanswer.trim().toLowerCase() ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    <p className="font-bold">{userInput.trim().toLowerCase() === currentQ.correctanswer.trim().toLowerCase() ? "Chính xác! 🎉" : "Chưa đúng."}</p>
                    <p className="text-sm mt-1">Đáp án: <span className="font-mono font-bold">{currentQ.correctanswer}</span></p>
                  </div>
                  <button onClick={handleNext} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition">Câu tiếp theo →</button>
                </div>
              )}
            </>
          ) : (
            /* --- KHU VỰC GIAO DIỆN PART 2 --- */
            <>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6">
                <h3 className="font-bold text-gray-700 mb-4">Nghe và chép lại toàn bộ:</h3>
                <InputRow label="Q" value={inputQ} setValue={setInputQ} answer={currentQ.question} />
                <hr className="my-4 border-gray-200" />
                <InputRow label="A" value={inputA} setValue={setInputA} answer={currentQ.optionA} />
                <InputRow label="B" value={inputB} setValue={setInputB} answer={currentQ.optionB} />
                <InputRow label="C" value={inputC} setValue={setInputC} answer={currentQ.optionC} />
              </div>
              {!showResult ? (
                <button onClick={() => setShowResult(true)} className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold hover:bg-blue-600 shadow-md">
                  Kiểm tra chi tiết
                </button>
              ) : (
                <button onClick={handleNext} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black shadow-md">
                  Câu tiếp theo →
                </button>
              )}
            </>
          )}
        </div>

        {/* CỘT PHỤ: BẢNG TỪ VỰNG DÙNG CHUNG CẢ 2 PART */}
        {showResult && vocabList.length > 0 && (
          <div className="w-full md:w-80 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit transition-all">
            <h3 className={`font-bold mb-4 uppercase text-sm text-center ${isPart2 ? 'text-blue-600' : 'text-green-600'}`}>Danh sách từ vựng</h3>
            <table className="w-full text-sm">
              <tbody>
                {vocabList.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 font-bold text-gray-800 pr-2">{item.word}</td>
                    <td className="py-3 text-gray-600">{item.mean}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Đang tải...</div>}><ExerciseContent /></Suspense>;
}