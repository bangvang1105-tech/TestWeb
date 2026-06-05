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

export default function HomePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('Tổng quan');
  const [userProgress, setUserProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Lấy User ID động từ trình duyệt
  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // Xử lý bảo mật chặn truy cập trái phép & Lấy tiến trình học tập thực tế
  useEffect(() => {
    // 🛡️ CHẶN BẢO MẬT: Nếu chưa đăng nhập (không có ID), đá ngay về trang login
    if (!CURRENT_USER_ID) {
      router.push('/login');
      return;
    }

    async function fetchProgress() {
      try {
        setLoadingProgress(true);
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
  }, [activeMenu, CURRENT_USER_ID, router]);

  const menuItems = ['Tổng quan', 'Khóa học', 'Ngữ pháp', 'Từ vựng', 'Bài tập'];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId'); // Xóa lịch sử đăng nhập
    }
    router.push('/login');
  };

  // Dữ liệu danh sách bài học gốc
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

  // Ánh xạ trạng thái làm bài thực tế từ Firestore
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

      return { ...item, status, score: scoreText };
    });
  };

  const handleNavigation = (type, id) => {
    router.push(`/lesson?type=${type}&id=${id}`);
  };

  const renderCards = (rawDataList, type) => {
    if (loadingProgress) {
      return <p className="text-gray-400 text-xs mt-4">Đang tải dữ liệu học tập...</p>;
    }

    const dataList = buildDisplayData(rawDataList, type);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {dataList.map((item) => (
          <div
            key={item.id}
            className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200"
          >
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-gray-800 text-sm line-clamp-1 flex-1">
                {item.title}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                Điểm: {item.score}
              </span>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-md
                ${item.status === 'Đã làm' ? 'bg-green-100 text-green-700' : ''}
                ${item.status === 'Đang làm' ? 'bg-amber-100 text-amber-700' : ''}
                ${item.status === 'Chưa làm' ? 'bg-gray-100 text-gray-500' : ''}
              `}>
                {item.status}
              </span>

              <div className="flex items-center gap-2">
                {item.status === 'Chưa làm' && (
                  <button
                    onClick={() => handleNavigation(type, item.id)}
                    style={{ backgroundColor: BRAND }}
                    className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150"
                  >
                    Làm bài
                  </button>
                )}

                {item.status === 'Đang làm' && (
                  <button
                    onClick={() => handleNavigation(type, item.id)}
                    style={{ backgroundColor: BRAND }}
                    className="text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition duration-150 whitespace-nowrap"
                  >
                    Tiếp tục làm bài
                  </button>
                )}

                {item.status === 'Đã làm' && (
                  <>
                    <button
                      onClick={() => handleNavigation(type, item.id)} 
                      style={{ border: `1px solid ${BRAND}`, color: BRAND }}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-green-50 transition duration-150 whitespace-nowrap"
                    >
                      Xem lại bài
                    </button>
                    <button
                      onClick={() => handleNavigation(type, item.id)}
                      style={{ backgroundColor: BRAND }}
                      className="text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition duration-150 whitespace-nowrap"
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
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tiến trình học tập</h2>
            <p className="text-gray-600 text-sm">Chào mừng bạn quay trở lại lớp học của Thầy Băng. Chọn các mục bên thanh điều hướng để bắt đầu học tập.</p>
          </div>
        );
      case 'Khóa học':
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Khóa học của bạn</h2>
            <p className="text-gray-600 text-sm">Danh sách các khóa học TOEIC trực tuyến.</p>
          </div>
        );
      case 'Ngữ pháp':
        return (
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Grammar (Ngữ pháp)</h2>
            {renderCards(rawGrammarData, 'grammar')}
          </div>
        );
      case 'Từ vựng':
        return (
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Vocabulary (Từ vựng)</h2>
            {renderCards(rawVocabularyData, 'vocabulary')}
          </div>
        );
      case 'Bài tập':
        return (
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Exercises (Bài tập)</h2>
            {renderCards(rawExerciseData, 'exercise')}
          </div>
        );
      default:
        return <p className="text-gray-500">Đang tải dữ liệu...</p>;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${roboto.className}`}>
      {/* ===== HEADER BAR ===== */}
      <header style={{ backgroundColor: BRAND }} className="shadow-md px-6 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
        <span className="text-white font-bold text-xl tracking-wide">TOEIC Thầy Băng</span>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">Xin chào, {CURRENT_USER_ID}!</span>
          <button onClick={handleLogout} style={{ color: BRAND }} className="bg-white font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-green-50 transition duration-200 shadow-sm">Đăng xuất</button>
        </div>
      </header>

      {/* ===== LAYOUT BODY ===== */}
      <div className="flex flex-1 pt-14">
        {/* ===== SIDEBAR ===== */}
        <aside style={{ backgroundColor: BRAND }} className="w-48 shadow-lg flex flex-col py-6 px-3 gap-1 fixed left-0 top-14 bottom-0 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveMenu(item)}
              style={activeMenu === item ? { color: BRAND } : {}}
              className={`text-left w-full px-4 py-3 rounded-lg text-sm font-semibold transition duration-150
                ${activeMenu === item ? 'bg-white shadow-sm' : 'text-white hover:bg-white/20'}`}
            >
              {item}
            </button>
          ))}
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 p-8 ml-48">
          <div className="max-w-5xl mx-auto rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-4">
              Trang chủ / <span style={{ color: BRAND }} className="font-medium">{activeMenu}</span>
            </p>
            <div className="mt-2">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}