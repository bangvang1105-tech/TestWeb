'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'hoc_vien_01' : 'hoc_vien_01';

function parseExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const qSheet = workbook.Sheets[firstSheetName];
  const questions = qSheet ? XLSX.utils.sheet_to_json(qSheet, { defval: '' }) : [];

  const groupMap = {};
  questions.forEach((q) => {
    if (!q.question_id) return;
    const gid = (q.group_id !== undefined && q.group_id !== '') ? q.group_id : q.question_id;
    
    if (!groupMap[gid]) {
      groupMap[gid] = {
        group_id: gid,
        image_url: q.image_url || '',
        audio_url: q.audio_url || '',
        passage: q.passage || '',
        questions: [],
      };
    }

    const sourceAnswer = q['correct answer'] !== undefined ? q['correct answer'] : q.answer;
    let rawAns = String(sourceAnswer).toUpperCase().trim();
    if (rawAns === '1') rawAns = 'A';
    if (rawAns === '2') rawAns = 'B';
    if (rawAns === '3') rawAns = 'C';
    if (rawAns === '4') rawAns = 'D';
    
    groupMap[gid].questions.push({
      question_id: q.question_id,
      question: q.question,
      A: q.A, B: q.B, C: q.C, D: q.D,
      answer: rawAns,
      explanation: q.explanation || '',
    });
  });

  return { config: {}, groups: Object.values(groupMap), totalQuestions: questions.length };
}

function AudioPlayer({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-2.5 w-full">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => {
          const t = e.target;
          setProgress(t.duration ? (t.currentTime / t.duration) * 100 : 0);
          setCurrentTime(fmt(t.currentTime));
        }}
        onLoadedMetadata={(e) => setDuration(fmt(e.target.duration))}
        onEnded={() => setPlaying(false)}
      />
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-green-400 border-none cursor-pointer flex items-center justify-center flex-shrink-0 active:scale-95 transition">
        {playing
          ? <svg width="12" height="12" viewBox="0 0 12 12" fill="#14532d"><rect x="1" y="1" width="3.5" height="10" rx="1"/><rect x="7.5" y="1" width="3.5" height="10" rx="1"/></svg>
          : <svg width="12" height="12" viewBox="0 0 12 12" fill="#14532d"><polygon points="2,1 11,6 2,11"/></svg>
        }
      </button>
      <div className="flex-1 h-1 bg-gray-200 rounded-full cursor-pointer relative"
        onClick={(e) => {
          if (!audioRef.current?.duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration;
        }}
      >
        <div className="absolute top-0 left-0 h-full bg-green-400 rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">{currentTime} / {duration}</span>
    </div>
  );
}

function ContentZone({ group }) {
  if (!group.image_url && !group.audio_url && !group.passage) {
    return <div className="p-5 text-gray-400 text-xs text-center font-medium">Câu hỏi độc lập — Không có dữ liệu đính kèm.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {group.image_url && (
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
          <div className="text-[10px] font-bold text-gray-400 px-3 py-1 bg-gray-50 border-b border-gray-100">🖼️ HÌNH ẢNH MINH HỌA</div>
          <div className="p-2 flex justify-center"><img src={group.image_url} alt="Nội dung đề bài" className="w-full max-h-60 object-contain rounded-lg" /></div>
        </div>
      )}
      {group.audio_url && (
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
          <div className="text-[10px] font-bold text-gray-400 px-3 py-1 bg-gray-50 border-b border-gray-100">🎵 FILE NGHE AUDIO</div>
          <div className="p-2"><AudioPlayer url={group.audio_url} /></div>
        </div>
      )}
      {group.passage && (
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
          <div className="text-[10px] font-bold text-gray-400 px-3 py-1 bg-gray-50 border-b border-gray-100">📄 ĐOẠN VĂN NGỮ CẢNH</div>
          <div className="p-4"><p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line m-0 font-medium">{group.passage}</p></div>
        </div>
      )}
    </div>
  );
}

function LessonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const lessonId = `${type}_${id}`; 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lessonMeta, setLessonMeta] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [showResultCard, setShowResultCard] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'lessons', lessonId));
        if (!snap.exists()) throw new Error('Không tìm thấy cấu hình bài học này trên hệ thống.');
        const meta = snap.data();
        setLessonMeta(meta);

        if (!meta.fileUrl) throw new Error('Bài học chưa được cấu hình đường dẫn fileUrl.');

        const res = await fetch(meta.fileUrl);
        if (!res.ok) throw new Error('Không thể tải tệp dữ liệu bài học.');
        const buffer = await res.arrayBuffer();

        const { groups, totalQuestions: total } = parseExcel(buffer);
        setTotalQuestions(total);

        const flat = [];
        groups.forEach((g) => {
          g.questions.forEach((q) => flat.push({ ...q, groupRef: g }));
        });
        setAllQuestions(flat);

        const progressSnap = await getDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', lessonId));
        if (progressSnap.exists()) {
          const progressData = progressSnap.data();
          setAnswers(progressData.answers || {});
          if (progressData.status === 'completed') {
            setScore(progressData.score);
            setSubmitted(true);
            setShowResultCard(true); 
          }
        }
      } catch (err) {
        setError(err.message || 'Đã xảy ra lỗi.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId, CURRENT_USER_ID]);

  const currentLessonAnswerCount = allQuestions.filter(q => answers[q.question_id] !== undefined).length;

  const handleSelect = async (qid, option) => {
    if (submitted) return;
    const updatedAnswers = { ...answers, [qid]: option };
    setAnswers(updatedAnswers);

    try {
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', lessonId), {
        status: 'in_progress',
        answers: updatedAnswers,
        score: 0,
        totalQuestions: totalQuestions,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    let correct = 0;
    allQuestions.forEach((q) => { if (answers[q.question_id] === q.answer) correct++; });
    
    setScore(correct);
    setSubmitted(true);
    setShowResultCard(true);

    try {
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', lessonId), {
        status: 'completed',
        answers: answers,
        score: correct,
        totalQuestions: totalQuestions,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const currentQ = allQuestions[currentQIndex];
  const currentGroup = currentQ?.groupRef;

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 ${roboto.className}`}>
        <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm font-semibold">Đang nạp dữ liệu bài tập chuyên sâu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 ${roboto.className}`}>
        <p className="text-red-500 font-bold text-sm">⚠️ {error}</p>
        <button onClick={() => router.back()} className="bg-green-400 text-white border-none rounded-xl px-5 py-2 text-xs font-bold cursor-pointer">← Quay về</button>
      </div>
    );
  }

  if (submitted && score !== null && showResultCard) {
    const pct = Math.round((score / totalQuestions) * 100);
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 p-4 ${roboto.className}`}>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm w-full shadow-lg">
          <div className="text-5xl font-black text-green-400 mb-1">{pct}%</div>
          <div className="text-sm font-semibold text-gray-600 mb-2">Kết quả làm bài: <strong className="text-gray-800">{score}/{totalQuestions}</strong> câu đúng</div>
          <div className="text-xs text-gray-400 mb-6 font-medium">{pct >= 80 ? '🎉 Xuất sắc! Học lực của bạn rất tuyệt vời.' : pct >= 60 ? '👍 Khá tốt! Đọc kỹ giải thích các câu sai.' : '💪 Kiên trì luyện tập thêm để cải thiện phản xạ.'}</div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setShowResultCard(false)} className="w-full bg-green-400 text-white border-none rounded-xl py-2.5 text-xs font-bold cursor-pointer transition hover:opacity-95">Xem đáp án chi tiết</button>
            <button onClick={() => router.back()} className="w-full bg-gray-100 text-gray-600 border-none rounded-xl py-2.5 text-xs font-bold cursor-pointer transition hover:bg-gray-200">Trang chủ</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-gray-50 overflow-hidden antialiased ${roboto.className}`}>
      {/* HEADER */}
      <header className="bg-green-400 p-3 px-4 flex items-center justify-between flex-shrink-0 shadow-md z-10">
        <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát</button>
        <span className="text-white font-black text-sm">{lessonMeta?.title || 'Bài làm'} {submitted && "(Xem lại đáp án)"}</span>
        <span className="text-white/90 text-xs font-bold">Đã chọn: {currentLessonAnswerCount}/{totalQuestions}</span>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* CỘT A: MỤC LỤC SỐ CÂU */}
        <aside className="w-full md:w-20 flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-col max-h-32 md:max-h-none overflow-hidden">
          <div className="text-[10px] font-black text-gray-400 text-center py-2 border-b border-gray-50 hidden md:block tracking-wider">MỤC LỤC</div>
          <div className="overflow-y-auto flex-1 p-2 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-hidden">
            {allQuestions.map((q, idx) => {
              const isActive = idx === currentQIndex;
              const isDone = answers[q.question_id] !== undefined;
              const isCorrect = answers[q.question_id] === q.answer;

              return (
                <button 
                  key={q.question_id} 
                  onClick={() => setCurrentQIndex(idx)} 
                  className={`min-w-9 h-9 md:w-full md:h-auto py-2 text-center text-xs font-bold rounded-lg border-none cursor-pointer transition flex-shrink-0
                    ${isActive ? 'bg-green-400 text-white' : isDone ? (submitted ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-green-50 text-green-700') : 'bg-gray-100 text-gray-400'}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>

        {/* CỘT B: NGỮ CẢNH ĐỀ BÀI */}
        <section className="flex-1 md:flex-[1.2] bg-white border-b md:border-b-0 md:border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="text-[10px] font-black text-gray-400 p-2 px-4 bg-gray-50 border-b border-gray-100 tracking-wider">NGỮ CẢNH ĐỀ BÀI</div>
          <div className="overflow-y-auto flex-1 p-4">
            {currentGroup && <ContentZone group={currentGroup} />}
          </div>
        </section>

        {/* CỘT C: LỰA CHỌN ĐÁP ÁN ĐỀ BÀI */}
        <section className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="text-[10px] font-black text-gray-400 p-2 px-4 bg-gray-50 border-b border-gray-100 tracking-wider">LỰA CHỌN ĐÁP ÁN</div>
          <div className="overflow-y-auto flex-1 p-4">
            {currentQ && (
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                <div className="p-3.5 bg-gray-50/50 border-b border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 mb-1">Câu hỏi {currentQIndex + 1} / {totalQuestions}</div>
                  <div className="text-sm font-bold text-gray-800 leading-relaxed">{currentQ.question}</div>
                </div>
                
                <div className="p-3 flex flex-col gap-2">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const selected = answers[currentQ.question_id] === opt;
                    const isCorrect = opt === currentQ.answer;
                    
                    let cardStyle = "border-gray-200 bg-white text-gray-700";
                    let badgeStyle = "bg-gray-100 text-gray-400 border border-gray-200";

                    if (!submitted && selected) {
                      cardStyle = "border-green-400 bg-green-50/30 text-green-800";
                      badgeStyle = "bg-green-400 text-white";
                    } else if (submitted) {
                      if (isCorrect) {
                        cardStyle = "border-green-400 bg-green-50/40 text-green-800";
                        badgeStyle = "bg-green-400 text-white";
                      } else if (selected && !isCorrect) {
                        cardStyle = "border-red-400 bg-red-50/40 text-red-800";
                        badgeStyle = "bg-red-400 text-white";
                      } else {
                        cardStyle = "border-gray-100 bg-white text-gray-300 opacity-60";
                      }
                    }

                    return (
                      <button key={opt} onClick={() => handleSelect(currentQ.question_id, opt)} disabled={submitted} className={`flex items-center gap-3 p-3 rounded-xl text-left w-full border transition duration-150 ${submitted ? 'cursor-default' : 'cursor-pointer hover:border-green-300'} ${cardStyle}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition ${badgeStyle}`}>{opt}</span>
                        <span className="text-xs font-semibold leading-relaxed">{currentQ[opt]}</span>
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div className="m-3 mt-1 p-3.5 bg-green-50/60 border border-green-200/60 rounded-xl">
                    <div className="text-[11px] font-black text-green-800 mb-1">💡 GIẢI THÍCH CHI TIẾT</div>
                    <p className="text-xs text-green-800 font-medium leading-relaxed whitespace-pre-line m-0">{currentQ.explanation || "Câu hỏi này chưa cập nhật văn bản giải thích."}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 p-3 px-4 flex items-center justify-between flex-shrink-0 gap-4">
        <div className="flex gap-2">
          <button onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))} disabled={currentQIndex === 0} className="border border-gray-200 rounded-lg p-2 px-3 text-xs font-bold text-gray-600 bg-white disabled:opacity-40 disabled:cursor-not-allowed">← Trước</button>
          <button onClick={() => setCurrentQIndex((i) => Math.min(allQuestions.length - 1, i + 1))} disabled={currentQIndex === allQuestions.length - 1} className="border border-gray-200 rounded-lg p-2 px-3 text-xs font-bold text-gray-600 bg-white disabled:opacity-40 disabled:cursor-not-allowed">Sau →</button>
        </div>
        
        {submitted ? (
          <button onClick={() => setShowResultCard(true)} className="bg-blue-500 text-white border-none rounded-lg p-2 px-4 text-xs font-bold cursor-pointer transition hover:opacity-95">Xem điểm số 📊</button>
        ) : (
          <button onClick={handleSubmit} className="bg-green-400 text-white border-none rounded-lg p-2 px-4 text-xs font-bold cursor-pointer transition hover:opacity-95">Nộp bài hoàn thành ✓</button>
        )}
      </footer>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-sm font-semibold">Đang nạp bộ đề đề...</div>}>
      <LessonContent />
    </Suspense>
  );
}