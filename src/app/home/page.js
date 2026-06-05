'use client';

import { useState } from 'react';

// ===================== DỮ LIỆU MẪU =====================

const grammarData = [
  { id: 1, title: 'Thì hiện tại đơn', status: 'done', score: 9, maxScore: 10 },
  { id: 2, title: 'Thì hiện tại tiếp diễn', status: 'doing', score: 5, maxScore: 10 },
  { id: 3, title: 'Thì quá khứ đơn', status: 'notDone', score: 0, maxScore: 10 },
  { id: 4, title: 'Thì quá khứ tiếp diễn', status: 'notDone', score: 0, maxScore: 10 },
  { id: 5, title: 'Thì tương lai đơn', status: 'done', score: 8, maxScore: 10 },
  { id: 6, title: 'Thì hiện tại hoàn thành', status: 'doing', score: 3, maxScore: 10 },
  { id: 7, title: 'Câu điều kiện loại 1', status: 'notDone', score: 0, maxScore: 10 },
  { id: 8, title: 'Câu điều kiện loại 2', status: 'notDone', score: 0, maxScore: 10 },
  { id: 9, title: 'Câu bị động', status: 'done', score: 10, maxScore: 10 },
  { id: 10, title: 'Mệnh đề quan hệ', status: 'notDone', score: 0, maxScore: 10 },
];

const vocabularyData = [
  { id: 1, title: 'Chủ đề: Gia đình', status: 'done', score: 10, maxScore: 10 },
  { id: 2, title: 'Chủ đề: Trường học', status: 'done', score: 7, maxScore: 10 },
  { id: 3, title: 'Chủ đề: Thực phẩm', status: 'doing', score: 4, maxScore: 10 },
  { id: 4, title: 'Chủ đề: Du lịch', status: 'notDone', score: 0, maxScore: 10 },
  { id: 5, title: 'Chủ đề: Sức khỏe', status: 'notDone', score: 0, maxScore: 10 },
  { id: 6, title: 'Chủ đề: Công việc', status: 'doing', score: 6, maxScore: 10 },
  { id: 7, title: 'Chủ đề: Thiên nhiên', status: 'notDone', score: 0, maxScore: 10 },
  { id: 8, title: 'Chủ đề: Công nghệ', status: 'done', score: 9, maxScore: 10 },
  { id: 9, title: 'Chủ đề: Thể thao', status: 'notDone', score: 0, maxScore: 10 },
  { id: 10, title: 'Chủ đề: Nghệ thuật', status: 'notDone', score: 0, maxScore: 10 },
];

const exercisesData = [
  { id: 1, title: 'Bài tập: Điền vào chỗ trống', status: 'done', score: 8, maxScore: 10 },
  { id: 2, title: 'Bài tập: Chọn đáp án đúng', status: 'done', score: 9, maxScore: 10 },
  { id: 3, title: 'Bài tập: Sắp xếp câu', status: 'doing', score: 5, maxScore: 10 },
  { id: 4, title: 'Bài tập: Viết lại câu', status: 'notDone', score: 0, maxScore: 10 },
  { id: 5, title: 'Bài tập: Dịch câu', status: 'notDone', score: 0, maxScore: 10 },
  { id: 6, title: 'Bài tập: Đọc hiểu', status: 'done', score: 7, maxScore: 10 },
  { id: 7, title: 'Bài tập: Nghe điền từ', status: 'notDone', score: 0, maxScore: 10 },
  { id: 8, title: 'Bài tập: Nối từ', status: 'doing', score: 2, maxScore: 10 },
  { id: 9, title: 'Bài tập: Tìm lỗi sai', status: 'notDone', score: 0, maxScore: 10 },
  { id: 10, title: 'Bài tập: Hoàn thành đoạn văn', status: 'notDone', score: 0, maxScore: 10 },
];

// ===================== COMPONENT CARD =====================

function LessonCard({ item }) {
  const statusMap = {
    done: { label: 'Đã làm', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
    doing: { label: 'Đang làm', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
    notDone: { label: 'Chưa làm', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  };

  const s = statusMap[item.status];

  return (
    <div style={{
      width: '340px',        // ~9cm
      minHeight: '114px',    // ~3cm
      background: '#ffffff',
      border: `1.5px solid ${s.border}`,
      borderRadius: '14px',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.13)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Dòng trên: Tên bài + Trạng thái */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', lineHeight: 1.4, flex: 1 }}>
          {item.title}
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: s.color,
          background: s.bg,
          border: `1px solid ${s.border}`,
          borderRadius: '20px',
          padding: '2px 10px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {s.label}
        </span>
      </div>

      {/* Dòng dưới: Điểm + Nút */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Điểm: <strong style={{ color: '#1e293b' }}>{item.score}/{item.maxScore}</strong>
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#ffffff',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            padding: '5px 14px',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
          >
            Làm bài
          </button>

          {/* Nút "Xem lại bài" chỉ hiện khi đã làm xong */}
          {item.status === 'done' && (
            <button style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#16a34a',
              background: '#dcfce7',
              border: '1.5px solid #86efac',
              borderRadius: '8px',
              padding: '5px 14px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
              onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}
            >
              Xem lại bài
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== COMPONENT NỘI DUNG TỪNG MỤC =====================

function SectionPage({ title, subtitle, data }) {
  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{subtitle}</p>
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {data.map(item => (
          <LessonCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ===================== TRANG CHỦ =====================

const navItems = [
  { key: 'home', label: 'Trang chủ', icon: '🏠' },
  { key: 'grammar', label: 'Ngữ pháp', icon: '📖' },
  { key: 'vocabulary', label: 'Từ vựng', icon: '📝' },
  { key: 'exercises', label: 'Bài tập', icon: '✏️' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'grammar':
        return (
          <SectionPage
            title="Grammar (Ngữ pháp)"
            subtitle="Ôn tập và luyện tập các chủ điểm ngữ pháp tiếng Anh"
            data={grammarData}
          />
        );
      case 'vocabulary':
        return (
          <SectionPage
            title="Vocabulary (Từ vựng)"
            subtitle="Mở rộng vốn từ vựng theo từng chủ đề"
            data={vocabularyData}
          />
        );
      case 'exercises':
        return (
          <SectionPage
            title="Exercises (Bài tập)"
            subtitle="Luyện tập tổng hợp với các dạng bài tập đa dạng"
            data={exercisesData}
          />
        );
      default:
        return (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
              Chào mừng bạn đến với Trang Chủ! 👋
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Bạn đã đăng nhập thành công. Chọn mục học từ thanh bên trái để bắt đầu.
            </p>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              height: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '14px',
            }}>
              Không gian thiết kế giao diện của bạn nằm ở đây
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>

      {/* ===== SIDEBAR ===== */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
      }}>
        {/* Logo / Tên app */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #334155' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.5px' }}>
            📚 EnglishApp
          </span>
        </div>

        {/* Menu items */}
        <nav style={{ marginTop: '16px', flex: 1 }}>
          {navItems.map(item => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '11px 20px',
                  background: isActive ? '#3b82f6' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  borderRadius: isActive ? '0 8px 8px 0' : '0',
                  marginRight: isActive ? '12px' : '0',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = '#f1f5f9';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ===== NỘI DUNG CHÍNH ===== */}
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>
        {renderContent()}
      </main>
    </div>
  );
}