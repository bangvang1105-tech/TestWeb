'use client';
import { useState } from 'react';

export default function DictationExercise({ data }) {
  const [userInput, setUserInput] = useState("");
  const [showResult, setShowResult] = useState(false);

  // So sánh kết quả đơn giản (bỏ qua viết hoa/thường)
  const isCorrect = userInput.trim().toLowerCase() === data.correctanswer.trim().toLowerCase();

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-md mb-6">
      {/* Audio Player */}
      <audio controls src={data.audiourl} className="w-full mb-4" />

      {/* Ô nhập liệu chép chính tả */}
      <textarea
        className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-600 focus:border-green-500 outline-none"
        rows="3"
        placeholder="Gõ nội dung bạn nghe được tại đây..."
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={showResult}
      />

      {/* Các nút hành động */}
      <div className="mt-4 flex gap-2">
        {!showResult ? (
          <button 
            onClick={() => setShowResult(true)}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold"
          >
            Kiểm tra
          </button>
        ) : (
          <button 
            onClick={() => { setShowResult(false); setUserInput(""); }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Làm lại
          </button>
        )}
      </div>

      {/* Khu vực hiển thị đáp án khi kiểm tra */}
      {showResult && (
        <div className={`mt-4 p-4 rounded-lg ${isCorrect ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
          <p className="font-bold">{isCorrect ? "Chính xác! 🎉" : "Chưa chính xác. Thử lại nhé!"}</p>
          <p className="text-sm mt-1">Đáp án: <span className="font-mono">{data.correctanswer}</span></p>
        </div>
      )}
    </div>
  );
}