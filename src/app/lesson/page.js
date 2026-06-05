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

const BRAND = '#4ade80';
const BRAND_DARK = '#14532d';
const BRAND_LIGHT = '#f0fdf4';

// Tạm thời cố định userId để kiểm tra hệ thống.
// Sau này có Firebase Auth, bạn chỉ cần thay bằng ID tài khoản thật.
const CURRENT_USER_ID = "hoc_vien_01"; 

// ─── XỬ LÝ PARSE EXCEL ────────────────────────────────────────────────────────
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
    
    groupMap[gid].questions.push({
      question_id: q.question_id,
      question: q.question,
      A: q.A, 
      B: q.B, 
      C: q.C, 
      D: q.D,
      answer: String(q.answer).toUpperCase().trim(),
      explanation: q.explanation || '',
    });
  });

  return {
    config: {}, 
    groups: Object.values(groupMap),
    totalQuestions: questions.length,
  };
}

// ─── AUDIO PLAYER ─────────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
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
      <button onClick={toggle} style={{ width: 32, height: 32, borderRadius: '50%', background: BRAND, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {playing
          ? <svg width="12" height="12" viewBox="0 0 12 12" fill={BRAND_DARK}><rect x="1" y="1" width="3.5" height="10" rx="1"/><rect x="7.5" y="1" width="3.5" height="10" rx="1"/></svg>
          : <svg width="12" height="12" viewBox="0 0 12 12" fill={BRAND_DARK}><polygon points="2,1 11,6 2,11"/></svg>
        }
      </button>
      <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2, cursor: 'pointer' }}
        onClick={(e) => {
          if (!audioRef.current?.duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration;
        }}
      >
        <div style={{ width: `${progress}%`, height: 4, background: BRAND, borderRadius: 2, transition: 'width 0.1s linear' }} />
      </div>
      <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{currentTime} / {duration}</span>
    </div>
  );
}

// ─── CONTENT ZONE (ZONE B) ────────────────────────────────────────────────────
const blockStyle = { border: '0.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' };
const blockLabelStyle = { fontSize: 11, color: '#64748b', padding: '5px 12px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', fontWeight: 500 };

function ContentZone({ group }) {
  const hasImage = !!group.image_url;
  const hasAudio = !!group.audio_url;
  const hasPassage = !!group.passage;

  if (!hasImage && !hasAudio && !hasPassage) {
    return <div style={{ padding: 20, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Câu hỏi độc lập — không có nội dung đính kèm.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {hasImage && (
        <div style={blockStyle}>
          <div style={blockLabelStyle}>🖼 Hình ảnh</div>
          <div style={{ padding: 10 }}>
            <img src={group.image_url} alt="Nội dung" style={{ width: '100%', borderRadius: 6, objectFit: 'contain', maxHeight: 240 }} />
          </div>
        </div>
      )}
      {hasAudio && (
        <div style={blockStyle}>
          <div style={blockLabelStyle}>🎵 Audio</div>
          <div style={{ padding: 10 }}><AudioPlayer url={group.audio_url} /></div>
        </div>
      )}
      {hasPassage && (
        <div style={blockStyle}>
          <div style={blockLabelStyle}>📄 Đoạn văn</div>
          <div style={{ padding: '10px 14px' }}>
            <p style={{ fontSize: 13, lineHeight: 1.9, color: '#334155', whiteSpace: 'pre-line', margin: 0 }}>{group.passage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN LESSON CONTENT ──────────────────────────────────────────────────────
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

  useEffect(() => {
    async function load() {
      try {
        // 1. Tải cấu hình link Excel từ collection "lessons"
        const snap = await getDoc(doc(db, 'lessons', lessonId));
        if (!snap.exists()) throw new Error('Không tìm thấy cấu hình bài học này trên hệ thống.');
        const meta = snap.data();
        setLessonMeta(meta);

        // Đọc chính xác trường file_url từ Database Firestore của bạn
        if (!meta.file_url) throw new Error('Bài học chưa được cấu hình đường dẫn file_url.');

        // 2. Tải và xử lý tệp Excel
        const res = await fetch(meta.file_url);
        if (!res.ok) throw new Error('Không thể tải tệp dữ liệu bài học. Vui lòng kiểm tra lại quyền chia sẻ liên kết.');
        const buffer = await res.arrayBuffer();

        const { groups, totalQuestions: total } = parseExcel(buffer);
        setTotalQuestions(total);

        const flat = [];
        groups.forEach((g) => {
          g.questions.forEach((q) => flat.push({ ...q, groupRef: g }));
        });
        setAllQuestions(flat);

        // 3. Nạp lại tiến trình của người dùng (nếu có)
        const progressSnap = await getDoc(
          doc(db, 'users', CURRENT_USER_ID, 'progress', lessonId)
        );
        if (progressSnap.exists()) {
          const progressData = progressSnap.data();
          setAnswers(progressData.answers || {});
          if (progressData.status === 'completed') {
            setScore(progressData.score);
            setSubmitted(true);
          }
        }
      } catch (err) {
        setError(err.message || 'Đã xảy ra lỗi hệ thống.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId]);

  const handleSelect = async (qid, option) => {
    if (submitted) return;
    
    const updatedAnswers = { ...answers, [qid]: option };
    setAnswers(updatedAnswers);

    try {
      // Đồng bộ trạng thái "in_progress" khi học viên chọn đáp án
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', lessonId), {
        status: 'in_progress',
        answers: updatedAnswers,
        score: 0,
        totalQuestions: totalQuestions,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Lỗi đồng bộ tiến trình học: ", e);
    }
  };

  const handleSubmit = async () => {
    let correct = 0;
    allQuestions.forEach((q) => { 
      if (answers[q.question_id] === q.answer) correct++; 
    });
    
    setScore(correct);
    setSubmitted(true);

    try {
      // Đồng bộ lưu kết quả "completed" kèm điểm số chính xác lên Firestore
      await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', lessonId), {
        status: 'completed',
        answers: answers,
        score: correct,
        totalQuestions: totalQuestions,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Lỗi ghi điểm nộp bài: ", e);
    }
  };

  const currentQ = allQuestions[currentQIndex];
  const currentGroup = currentQ?.groupRef;

  const getOptionStyle = (qid, option) => {
    const selected = answers[qid] === option;
    const correctAnswer = allQuestions.find(q => q.question_id === qid)?.answer;
    const isCorrect = option === correctAnswer;
    if (!submitted) return { border: selected ? `1.5px solid ${BRAND}` : '0.5px solid #e2e8f0', background: selected ? BRAND_LIGHT : '#fff', color: selected ? '#166534' : '#334155' };
    if (isCorrect) return { border: '1.5px solid #4ade80', background: '#f0fdf4', color: '#166534' };
    if (selected && !isCorrect) return { border: '1.5px solid #f87171', background: '#fef2f2', color: '#991b1b' };
    return { border: '0.5px solid #e2e8f0', background: '#fff', color: '#94a3b8' };
  };

  const getKeyStyle = (qid, option) => {
    const selected = answers[qid] === option;
    const correctAnswer = allQuestions.find(q => q.question_id === qid)?.answer;
    const isCorrect = option === correctAnswer;
    if (!submitted) return { background: selected ? BRAND : 'transparent', color: selected ? BRAND_DARK : '#94a3b8', border: selected ? `1px solid ${BRAND}` : '0.5px solid #e2e8f0' };
    if (isCorrect) return { background: '#4ade80', color: BRAND_DARK, border: '1px solid #4ade80' };
    if (selected && !isCorrect) return { background: '#f87171', color: '#fff', border: '1px solid #f87171' };
    return { background: 'transparent', color: '#cbd5e1', border: '0.5px solid #e2e8f0' };
  };

  if (loading) {
    return (
      <div className={roboto.className} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${BRAND}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Đang đồng bộ dữ liệu bài học...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={roboto.className} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', gap: 12 }}>
        <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 500 }}>⚠️ {error}</p>
        <button onClick={() => router.back()} style={{ background: BRAND, color: BRAND_DARK, border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>← Quay lại trang chủ</button>
      </div>
    );
  }

  // Màn hình trả kết quả sau khi nộp bài thành công
  if (submitted && score !== null) {
    const pct = Math.round((score / totalQuestions) * 100);
    return (
      <div className={roboto.className} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e2e8f0', padding: '40px 48px', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: BRAND, marginBottom: 4 }}>{pct}%</div>
          <div style={{ fontSize: 15, color: '#475569', marginBottom: 4 }}>
            Kết quả làm bài: <strong style={{ color: '#1e293b' }}>{score}/{totalQuestions}</strong> câu đúng
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>
            {pct >= 80 ? '🎉 Xuất sắc! Kết quả học tập rất tuyệt vời.'
              : pct >= 60 ? '👍 Khá tốt! Đọc thêm giải thích các câu sai nhé.'
              : '💪 Hãy kiên trì luyện tập thêm để cải thiện phản xạ.'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={async () => { 
                setSubmitted(false); setAnswers({}); setScore(null); setCurrentQIndex(0);
                await setDoc(doc(db, 'users', CURRENT_USER_ID, 'progress', lessonId), {
                  status: 'not_started',
                  answers: {},
                  score: 0,
                  updatedAt: serverTimestamp()
                }, { merge: true });
              }}
              style={{ border: `1px solid ${BRAND}`, color: '#166534', background: 'transparent', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              Làm lại bài
            </button>
            <button
              onClick={() => setSubmitted(false)} 
              style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              Xem đáp án
            </button>
            <button
              onClick={() => router.back()}
              style={{ background: BRAND, color: BRAND_DARK, border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={roboto.className} style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
      <header style={{ background: BRAND, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, padding: '4px 10px', color: BRAND_DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Thoát</button>
        <span style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 14 }}>{lessonMeta?.title || 'Bài làm'}</span>
        <span style={{ color: BRAND_DARK, fontSize: 12, fontWeight: 500 }}>Đã chọn: {Object.keys(answers).length}/{totalQuestions} câu</span>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Zone A */}
        <aside style={{ width: 72, flexShrink: 0, background: '#fff', borderRight: '0.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'center', padding: '8px 4px 6px', borderBottom: '0.5px solid #e2e8f0', letterSpacing: '0.05em' }}>MỤC LỤC</div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allQuestions.map((q, idx) => {
              const isActive = idx === currentQIndex;
              const isDone = answers[q.question_id] !== undefined;
              return (
                <button key={q.question_id} onClick={() => setCurrentQIndex(idx)} style={{ width: '100%', padding: '6px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: 'none', background: isActive ? BRAND : isDone ? '#dcfce7' : '#f1f5f9', color: isActive ? BRAND_DARK : isDone ? '#166534' : '#64748b', transition: 'all 0.15s' }}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Zone B */}
        <section style={{ flex: 1.1, background: '#fff', borderRight: '0.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', padding: '7px 14px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', letterSpacing: '0.04em' }}>NGỮ CẢNH ĐỀ BÀI</div>
          <div style={{ overflowY: 'auto', flex: 1, padding: 14 }}>
            {currentGroup && <ContentZone group={currentGroup} />}
          </div>
        </section>

        {/* Zone C */}
        <section style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', padding: '7px 14px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', letterSpacing: '0.04em' }}>LỰA CHỌN ĐÁP ÁN</div>
          <div style={{ overflowY: 'auto', flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentQ && (
              <div style={{ border: '0.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Câu hỏi {currentQIndex + 1} trên {totalQuestions}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }}>{currentQ.question}</div>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button key={opt} onClick={() => handleSelect(currentQ.question_id, opt)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s', ...getOptionStyle(currentQ.question_id, opt) }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'all 0.15s', ...getKeyStyle(currentQ.question_id, opt) }}>{opt}</span>
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>{currentQ[opt]}</span>
                    </button>
                  ))}
                </div>
                {submitted && currentQ.explanation && (
                  <div style={{ margin: '0 12px 12px', padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '0.5px solid #86efac' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>💡 Phân tích & Giải thích chi tiết</div>
                    <p style={{ fontSize: 12, color: '#166534', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{currentQ.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer style={{ background: '#fff', borderTop: '0.5px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))} disabled={currentQIndex === 0} style={{ border: '0.5px solid #e2e8f0', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', color: currentQIndex === 0 ? '#cbd5e1' : '#475569', cursor: currentQIndex === 0 ? 'not-allowed' : 'pointer' }}>← Câu trước</button>
          <button onClick={() => setCurrentQIndex((i) => Math.min(allQuestions.length - 1, i + 1))} disabled={currentQIndex === allQuestions.length - 1} style={{ border: '0.5px solid #e2e8f0', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', color: currentQIndex === allQuestions.length - 1 ? '#cbd5e1' : '#475569', cursor: currentQIndex === allQuestions.length - 1 ? 'not-allowed' : 'pointer' }}>Câu sau →</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 100, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
            <div style={{ width: `${totalQuestions > 0 ? (Object.keys(answers).length / totalQuestions) * 100 : 0}%`, height: 4, background: BRAND, borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{Object.keys(answers).length}/{totalQuestions}</span>
        </div>
        <button onClick={handleSubmit} disabled={submitted} style={{ background: BRAND, color: BRAND_DARK, border: 'none', borderRadius: 7, padding: '7px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Nộp bài hoàn thành ✓</button>
      </footer>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>Đang tải đề bài...</div>}>
      <LessonContent />
    </Suspense>
  );
}