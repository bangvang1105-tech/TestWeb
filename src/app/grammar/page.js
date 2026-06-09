'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const BRAND = '#4ade80';
const BRAND_DARK = '#14532d';

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

  return (
    <div
      className={roboto.className}
      style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}
    >
      {/* HEADER */}
      <header
        style={{ background: BRAND, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexShrink: 0 }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, padding: '4px 10px', color: BRAND_DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          ← Thoát
        </button>
        <span style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 14, flex: 1, textAlign: 'center' }}>
          {modeInfo.icon} {modeInfo.label} — Bài {topic?.id}: {topic?.title || 'Chủ đề'}
        </span>
        <span style={{ fontSize: 12, color: BRAND_DARK, fontWeight: 500 }}>
          {topic?.subtitle}
        </span>
      </header>

      {/* BODY CHỨA PHẦN NỘI DUNG BÀI HỌC VỀ SAU */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '0.5px solid #e2e8f0',
            padding: '48px 56px',
            textAlign: 'center',
            maxWidth: 640,
            width: '100%',
            boxShadow: '0 2px 16px 0 rgba(74,222,128,0.08)',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>{modeInfo.icon}</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
            {modeInfo.label}
          </h1>
          <div
            style={{ display: 'inline-block', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '4px 14px', marginBottom: 16 }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
              Bài {topic?.id}: {topic?.title} ({topic?.subtitle})
            </span>
          </div>

          {/* Vùng không gian hiển thị bài học mẫu */}
          <div style={{ marginTop: 12, marginBottom: 32, padding: 20, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.7 }}>
              [Khu vực tích hợp nội dung]<br />
              {mode === 'video' ? 'Hệ thống chuẩn bị trình phát Video bài giảng lý thuyết.' : 'Hệ thống chuẩn bị tài liệu nhúng Slide PDF/Powerpoint.'}
            </p>
          </div>

          <button
            onClick={() => router.back()}
            style={{ background: BRAND, color: BRAND_DARK, border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            ← Quay lại danh sách bài học
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GrammarPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        Đang tải dữ liệu bài học ngữ pháp...
      </div>
    }>
      <GrammarContent />
    </Suspense>
  );
}