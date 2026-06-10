'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const BRAND = '#4ade80';

const GRAMMAR_TOPICS = [
  { id: 1, title: 'Từ loại', subtitle: 'Parts of Speech' },
  { id: 2, title: 'Từ hạn định & Mạo từ', subtitle: 'Determiners & Articles' },
  { id: 3, title: 'Các Thì', subtitle: 'Tenses' },
  { id: 4, title: 'Đại từ', subtitle: 'Pronouns' },
  { id: 5, title: 'Câu bị động', subtitle: 'Passive Voice' },
  { id: 6, title: 'Câu tường thuật', subtitle: 'Reported Speech' },
  { id: 7, title: 'Câu điều kiện', subtitle: 'Conditional Sentences' },
  { id: 8, title: 'Mệnh đề quan hệ', subtitle: 'Relative Clauses' },
  { id: 9, title: 'Giới từ', subtitle: 'Prepositions' },
  { id: 10, title: 'Liên từ', subtitle: 'Conjunctions' },
  { id: 11, title: 'Cấu tạo câu', subtitle: 'Sentence Structures' },
  { id: 12, title: 'Hòa hợp chủ vị', subtitle: 'Subject-Verb Agreement' },
  { id: 13, title: 'Các loại so sánh', subtitle: 'Comparisons' }, // 🌟 Đã tích hợp Chuyên đề 13 lý thuyết
];

const MODE_INFO = {
  video: { label: 'Video bài giảng', icon: '📺' },
  slide: { label: 'Slide bài giảng', icon: '📊' },
};

function GrammarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); 
  const topicId = searchParams.get('topic'); 

  const modeInfo = MODE_INFO[mode] || { label: 'Ngữ pháp', icon: '📝' };
  const topic = GRAMMAR_TOPICS.find(t => String(t.id) === String(topicId));

  const [lessonContent, setLessonContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true); // Vòng quay tải trang mượt mà cho iframe

  useEffect(() => {
    if (!topicId) return;
    async function fetchLessonData() {
      try {
        setLoading(true);
        setIframeLoading(true);
        const docSnap = await getDoc(doc(db, 'grammar_lessons', String(topicId)));
        if (docSnap.exists()) {
          setLessonContent(docSnap.data());
        }
      } catch (err) {
        console.error("Lỗi nạp link bài học ngữ pháp: ", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLessonData();
  }, [topicId, mode]);

  const handlePracticeNow = () => {
    router.push(`/lesson?type=grammar_practice&id=${topicId}`);
  };

  return (
    <div className={`${roboto.className} min-h-screen bg-gray-50 flex flex-col`}>
      {/* HEADER */}
      <header className="bg-green-400 p-3 px-5 flex items-center justify-between shadow-md">
        <button onClick={() => router.back()} className="bg-white/20 border-none rounded-lg p-1.5 px-3 text-white text-xs font-bold cursor-pointer transition hover:bg-white/30">← Thoát</button>
        <span className="text-white font-black text-sm text-center flex-1">{modeInfo.icon} {modeInfo.label} — Bài {topic?.id}: {topic?.title}</span>
        <span className="text-white/90 text-xs font-bold hidden sm:inline">{topic?.subtitle}</span>
      </header>

      {/* BODY */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Khung Trình Phát */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex-1 flex flex-col min-h-[460px]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-xs font-bold">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
              Đang tải tư liệu bài giảng...
            </div>
          ) : (
            <div className="flex-1 w-full h-full rounded-xl overflow-hidden bg-black relative">
              {mode === 'video' ? (
                lessonContent?.videoUrl ? (
                  <iframe 
                    src={lessonContent.videoUrl} 
                    className="w-full h-full border-none absolute top-0 left-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold p-4 text-center">📺 Chưa có liên kết Video bài giảng cho chuyên đề này.</div>
                )
              ) : (
                lessonContent?.slideUrl ? (
                  <div className="w-full h-full relative">
                    {iframeLoading && (
                      <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-2 text-gray-400 text-xs font-semibold z-10">
                        <div className="w-6 h-6 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
                        Đang tối ưu hiển thị slide tài liệu...
                      </div>
                    )}
                    <iframe 
                      src={lessonContent.slideUrl} 
                      className="w-full h-full border-none absolute top-0 left-0 bg-white"
                      allow="autoplay"
                      onLoad={() => setIframeLoading(false)}
                    ></iframe>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold p-4 text-center">📊 Chưa có liên kết Slide bài giảng cho chuyên đề này.</div>
                )
              )}
            </div>
          )}
        </div>

        {/* FOOTER ĐIỀU HƯỚNG BÀI TẬP LIÊN KẾT */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="text-center sm:text-left">
            <h4 className="text-gray-800 font-extrabold text-sm m-0">Đã nắm vững lý thuyết chuyên đề?</h4>
            <p className="text-gray-400 text-xs m-0 mt-0.5">Bứt phá điểm số bằng cách rèn luyện bộ câu hỏi trắc nghiệm ngay.</p>
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <button onClick={() => router.back()} className="flex-1 sm:flex-none bg-gray-100 text-gray-500 font-bold text-xs p-2.5 px-5 rounded-xl cursor-pointer hover:bg-gray-200 transition">Quay lại danh mục</button>
            <button onClick={handlePracticeNow} className="flex-1 sm:flex-none bg-orange-400 shadow-md shadow-orange-400/20 text-white font-bold text-xs p-2.5 px-6 rounded-xl cursor-pointer hover:opacity-95 transition">Luyện tập ngay 🚀</button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function GrammarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-xs font-bold">Đang nạp dữ liệu bài học ngữ pháp...</div>}>
      <GrammarContent />
    </Suspense>
  );
}