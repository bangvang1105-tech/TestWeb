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

const VOCAB_TOPICS = [
  { id: 1, title: 'Hợp đồng & Đàm phán', subtitle: 'Contracts' },
  { id: 2, title: 'Marketing & Quảng cáo', subtitle: 'Marketing' },
  { id: 3, title: 'Phát triển doanh nghiệp', subtitle: 'Business' },
  { id: 4, title: 'Hội nghị & Sự kiện', subtitle: 'Conferences' },
  { id: 5, title: 'Tuyển dụng & Nhân sự', subtitle: 'Employment' },
  { id: 6, title: 'Mua sắm & Đặt hàng', subtitle: 'Purchasing' },
  { id: 7, title: 'Ngân hàng & Tài chính', subtitle: 'Banking' },
  { id: 8, title: 'Kế toán & Thuế', subtitle: 'Accounting' },
  { id: 9, title: 'Quản lý văn phòng', subtitle: 'Office Corporate' },
  { id: 10, title: 'Quản lý nhân viên', subtitle: 'Personnel' },
  { id: 11, title: 'Du lịch & Khách sạn', subtitle: 'Travel' },
  { id: 12, title: 'Giải trí & Ăn uống', subtitle: 'Entertainment' },
  { id: 13, title: 'Sức khỏe & Y tế', subtitle: 'Health' },
];

const MODE_INFO = {
  learn:    { label: 'Học từ vựng',         icon: '📖' },
  flashcard:{ label: 'Flashcards',           icon: '🃏' },
  quiz:     { label: 'Trắc nghiệm từ vựng', icon: '✏️' },
  match:    { label: 'Tìm cặp',             icon: '🔗' },
  listen:   { label: 'Nghe từ vựng',        icon: '🎧' },
};

function VocabularyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const topicId = searchParams.get('topic');

  const modeInfo = MODE_INFO[mode] || { label: 'Từ vựng', icon: '📚' };
  const topic = VOCAB_TOPICS.find(t => String(t.id) === String(topicId));

  return (
    <div
      className={roboto.className}
      style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}
    >
      {/* HEADER */}
      <header
        style={{ background: BRAND, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, padding: '4px 10px', color: BRAND_DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          ← Thoát
        </button>
        <span style={{ color: BRAND_DARK, fontWeight: 700, fontSize: 14 }}>
          {modeInfo.icon} {modeInfo.label} — {topic?.title || 'Chủ đề'}
        </span>
        <span style={{ fontSize: 12, color: BRAND_DARK, fontWeight: 500 }}>
          {topic?.subtitle}
        </span>
      </header>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '0.5px solid #e2e8f0',
            padding: '48px 56px',
            textAlign: 'center',
            maxWidth: 480,
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
              {topic?.title} ({topic?.subtitle})
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 32, lineHeight: 1.7 }}>
            Tính năng <strong style={{ color: '#475569' }}>{modeInfo.label}</strong> cho chủ đề này đang được phát triển.<br />
            Vui lòng quay lại sau hoặc chọn chủ đề khác để tiếp tục học tập.
          </p>
          <button
            onClick={() => router.back()}
            style={{ background: BRAND, color: BRAND_DARK, border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VocabularyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        Đang tải...
      </div>
    }>
      <VocabularyContent />
    </Suspense>
  );
}