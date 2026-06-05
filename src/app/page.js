'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const BRAND = '#4ade80';
const CURRENT_USER_ID = "hoc_vien_01"; // Khớp chính xác với userId bên trang làm bài

export default function HomePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('Tổng quan');
  const [userProgress, setUserProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Lấy dữ liệu tiến trình thực tế từ Database Firestore
  useEffect(() => {
    async function fetchProgress() {
      try {
        const querySnapshot = await getDocs(
          collection(db, 'users', CURRENT_USER_ID, 'progress')
        );
        const progressMap = {};
        querySnapshot.forEach((docSnap) => {
          progressMap[docSnap.id] = docSnap.data();
        });
        setUserProgress(progressMap);
      } catch (err) {
        console.error("Lỗi đồng bộ tiến trình học viên: ", err);
      } finally {
        setLoadingProgress(false);
      }
    }
    fetchProgress();
  }, [activeMenu]);

  const menuItems = ['Tổng quan', 'Khóa học', 'Ngữ pháp', 'Từ vựng', 'Bài tập'];

  const handleLogout = () => {
    router.push('/');
  };

  const rawGrammarData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Bài ${i + 1}: ${[
      'Thì Hiện tại đơn', 'Thì Hiện tại tiếp diễn', 'Thì Quá khứ đơn',
      'Thì Tương lai đơn', 'Mệnh đề quan hệ', 'Câu bị động',
      'Câu điều kiện loại 1', 'Câu điều kiện loại 2', 'Động từ khuyết thiếu', 'Danh động từ'
    ][i] || 'Chủ đề Ngữ pháp'}`
  }));

  const rawVocabularyData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Chủ đề ${i + 1}: ${[
      'Office (Văn phòng)', 'Travel (Du lịch)', 'Marketing (Quảng cáo)',
      'Finance (Tài chính)', 'Technology (Công nghệ)', 'Health (Sức khỏe)',
      'Shopping (Mua sắm)', 'Entertainment (Giải trí)', 'Transportation (Giao thông)', 'Personnel (Nhân sự)'
    ][i] || 'Chủ đề Từ vựng'}`
  }));

  const rawExerciseData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Đề Luyện tập số ${i + 1}`
  }));

  const buildDisplayData = (rawData, prefixType) => {
    return rawData.map(item => {
      const targetLessonId = `${prefixType}_${item.id}`; 
      const progress = userProgress[targetLessonId];

      let status = 'Chưa làm';
      let scoreText = '0/10';

      if (progress) {
        if (progress.status === 'completed') {
          status = 'Đã làm';
          scoreText = `${progress.score}/${progress.totalQuestions || 10}`;
        } else if (progress.status === 'in_progress') {
          status = 'Đang làm';
          scoreText = `0/${progress.totalQuestions || 10}`;
        }
      }

      return {
        ...item,
        status,
        score: scoreText
      };
    });
  };

  const handleNavigation = (type, id) => {
    router.push(`/lesson?type=${type}&id=${id}`);
  };

  const renderCards = (rawDataList, type) => {
    if (loadingProgress) {
      return <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16 }}>Đang kiểm tra tiến trình học viên...</p>;
    }

    const dataList = buildDisplayData(rawDataList, type);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(378px, 1fr))', gap: 24, marginTop: 16, width: '100%' }}>
        {dataList.map((item) => (
          <div
            key={item.id}
            style={{
              width: 378,
              height: 114,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
              <h3 style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', flex: 1 }}>
                {item.title}
              </h3>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: 4, whiteSpace: 'nowrap' }}>
                Điểm: {item.score}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 6,
                backgroundColor: item.status === 'Đã làm' ? '#dcfce7' : item.status === 'Đang làm' ? '#fef3c7' : '#f1f5f9',
                color: item.status === 'Đã làm' ? '#166534' : item.status === 'Đang làm' ? '#92400e' : '#64748b'
              }}>
                {item.status}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.status === 'Chưa làm' && (
                  <button
                    onClick={() => handleNavigation(type, item.id)}
                    style={{ backgroundColor: BRAND, color: '#14532d', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                  >
                    Làm bài
                  </button>
                )}

                {item.status === 'Đang làm' && (
                  <button
                    onClick={() => handleNavigation(type, item.id)}
                    style={{ backgroundColor: BRAND, color: '#14532d', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Tiếp tục làm bài
                  </button>
                )}

                {item.status === 'Đã làm' && (
                  <>
                    <button
                      onClick={() => handleNavigation(type, item.id)} 
                      style={{ border: `1px solid ${BRAND}`, color: '#166534', backgroundColor: 'transparent', fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Xem lại bài
                    </button>
                    <button
                      onClick={() => handleNavigation(type, item.id)}
                      style={{ backgroundColor: BRAND, color: '#14532d', fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Làm lại bài
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'Tổng quan':
        return (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 16, margin: 0 }}>Tiến trình học tập</h2>
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Chào mừng bạn quay trở lại lớp học của Thầy Băng. Chọn các mục bên thanh điều hướng để bắt đầu học tập.</p>
          </div>
        );

      case 'Khóa học':
        return (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 16, margin: 0 }}>Khóa học của bạn</h2>
            <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>Danh sách các khóa học TOEIC trực tuyến.</p>
          </div>
        );

      case 'Ngữ pháp':
        return (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 16, margin: 0 }}>Grammar (Ngữ pháp)</h2>
            {renderCards(rawGrammarData, 'grammar')}
          </div>
        );

      case 'Từ vựng':
        return (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 16, margin: 0 }}>Vocabulary (Từ vựng)</h2>
            {renderCards(rawVocabularyData, 'vocabulary')}
          </div>
        );

      case 'Bài tập':
        return (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 16, margin: 0 }}>Exercises (Bài tập)</h2>
            {renderCards(rawExerciseData, 'exercise')}
          </div>
        );

      default:
        return <p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p>;
    }
  };

  return (
    <div className={roboto.className} style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* ===== HEADER BAR ===== */}
      <header style={{ backgroundColor: BRAND, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, letterSpacing: '0.05em' }}>TOEIC Thầy Băng</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Hellu babe</span>
          <button onClick={handleLogout} style={{ color: '#166534', backgroundColor: '#fff', fontWeight: 600, fontSize: 14, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>Đăng xuất</button>
        </div>
      </header>

      {/* ===== LAYOUT BODY ===== */}
      <div style={{ display: 'flex', flex: 1, paddingTop: 56 }}>
        {/* ===== SIDEBAR ===== */}
        <aside style={{ backgroundColor: BRAND, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: 192, display: 'flex', flexDirection: 'column', padding: '24px 12px', gap: 4, position: 'fixed', left: 0, top: 56, bottom: 0, overflowY: 'auto' }}>
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveMenu(item)}
              style={{
                textAlign: 'left',
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: activeMenu === item ? '#fff' : 'transparent',
                color: activeMenu === item ? '#166534' : '#fff',
                boxShadow: activeMenu === item ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              {item}
            </button>
          ))}
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main style={{ flex: 1, padding: 32, marginLeft: 192 }}>
          <div style={{ maxWidth: 1024, margin: '0 auto', borderRadius: 12, backgroundColor: '#fff', padding: 24, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16, margin: 0 }}>
              Trang chủ / <span style={{ color: BRAND, fontWeight: 500 }}>{activeMenu}</span>
            </p>
            <div style={{ marginTop: 8 }}>{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}