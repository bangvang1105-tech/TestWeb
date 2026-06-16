'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { db } from '@/firebase'; 
import { collection, getDocs, query } from 'firebase/firestore';

function ExamContent() {
  const router = useRouter();
  // ... (Phần lấy dữ liệu giữ nguyên như cũ)
  
  // Các state mới cho UI/UX
  const [activePart, setActivePart] = useState(1); // Tab hiện tại (1-7)
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({}); // Lưu danh sách các câu cắm cờ

  // Nút Cắm cờ
  const toggleFlag = (id) => {
    setFlagged(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* 1. TOP HEADER (Cố định, chứa đồng hồ và nút nộp bài) */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 font-bold hover:bg-gray-100 px-3 py-1.5 rounded-lg">✕ Thoát</button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="font-black text-lg text-slate-800">ETS 2023 - TEST 1</h1>
        </div>
        
        {/* THANH ĐIỀU HƯỚNG PART (Tabs) */}
        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
          {[1,2,3,4,5,6,7].map(part => (
            <button 
              key={part} 
              onClick={() => setActivePart(part)}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activePart === part ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Part {part}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-4 py-1.5 rounded-lg">
            <span className="text-xl">⏱</span>
            <span className="font-mono font-bold text-xl tracking-wider">119:59</span>
          </div>
          <button className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all">Nộp Bài</button>
        </div>
      </header>

      {/* 2. KHU VỰC CHÍNH (Chiếm phần diện tích còn lại) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* KHU VỰC LÀM BÀI (Chia đôi màn hình nếu là Part 6,7) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
          
          {/* NỬA TRÁI: Dành cho Bài đọc / Hình ảnh (Chỉ hiện khi cần) */}
          <div className="w-full lg:w-1/2 p-6 overflow-y-auto border-r border-gray-200 custom-scrollbar">
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
                {/* Giả lập một bài đọc Part 7 */}
                <div className="mb-4 text-xs font-bold text-blue-500 uppercase tracking-widest border-b pb-2">Questions 147-148 refer to the following email</div>
                <h2 className="font-bold text-lg mb-4">Subject: Office Renovation Update</h2>
                <p className="text-slate-600 leading-relaxed text-justify">
                  Dear Staff, <br/><br/>
                  Please be advised that the main conference room will be closed for renovations starting next Monday. The project is expected to take three weeks. During this time, please book the smaller meeting rooms on the 2nd floor...
                </p>
             </div>
          </div>

          {/* NỬA PHẢI: Dành cho Câu hỏi và Đáp án */}
          <div className="w-full lg:w-1/2 p-6 overflow-y-auto custom-scrollbar">
             <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Demo 1 Câu hỏi */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group">
                  {/* Nút Cắm cờ */}
                  <button 
                    onClick={() => toggleFlag(147)}
                    className={`absolute top-4 right-4 p-2 rounded-full transition-all ${flagged[147] ? 'text-amber-500 bg-amber-50' : 'text-gray-300 hover:bg-gray-50'}`}
                  >
                    🚩
                  </button>

                  <div className="flex gap-3 mb-5 pr-10">
                    <span className="w-8 h-8 shrink-0 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center text-sm">147</span>
                    <p className="font-semibold text-slate-800 text-lg leading-relaxed">What is the main purpose of the email?</p>
                  </div>

                  <div className="pl-11 grid grid-cols-1 gap-2">
                    {/* Bố cục đáp án dọc, dễ click */}
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <button key={opt} className="flex items-center gap-3 p-3 border-2 border-slate-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left">
                        <span className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-sm">{opt}</span>
                        <span className="text-slate-700">To announce a building closure</span>
                      </button>
                    ))}
                  </div>
                </div>

             </div>
          </div>
        </div>

        {/* 3. BẢNG ĐÁP ÁN (SIDEBAR PHẢI) - Cố định không cuộn */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-black text-slate-800">Answer Sheet</h3>
            <div className="flex justify-between mt-2 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Đã làm: 1</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> Xem lại: {Object.values(flagged).filter(Boolean).length}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* Listening Section */}
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 mt-2">Listening (1-100)</h4>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {[...Array(100)].map((_, i) => (
                <button key={i+1} className="aspect-square border border-slate-200 rounded-md flex items-center justify-center text-xs font-semibold text-slate-600 hover:bg-slate-50 relative">
                  {i + 1}
                  {/* Dấu chấm cắm cờ nhỏ xíu ở góc */}
                  {flagged[i+1] && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white"></div>}
                </button>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Đang tải...</div>}>
      <ExamContent />
    </Suspense>
  );
}