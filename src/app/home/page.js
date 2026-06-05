'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Import font Roboto hỗ trợ tiếng Việt 100% từ Google Font
import { Roboto } from 'next/font/google';

// Cấu hình font Roboto
const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'], // Ép hệ thống render chuẩn bộ ký tự tiếng Việt
  display: 'swap',
});

const BRAND = '#4ade80';

export default function HomePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('Tổng quan');

  const menuItems = ['Tổng quan', 'Khóa học', 'Ngữ pháp', 'Từ vựng', 'Bài tập'];

  const handleLogout = () => {
    router.push('/');
  };

  const grammarData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Bài ${i + 1}: ${[
      'Thì Hiện tại đơn', 'Thì Hiện tại tiếp diễn', 'Thì Quá khứ đơn', 
      'Thì Tương lai đơn', 'Mệnh đề quan hệ', 'Câu bị động', 
      'Câu điều kiện loại 1', 'Câu điều kiện loại 2', 'Động từ khuyết thiếu', 'Danh động từ'
    ][i] || 'Chủ đề Ngữ pháp'}`,
    status: ['Đã làm', 'Đang làm', 'Chưa làm'][i % 3],
    score: i % 3 === 0 ? `${8 + (i % 3)}/10` : '0/10'
  }));

  const vocabularyData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Chủ đề ${i + 1}: ${[
      'Office (Văn phòng)', 'Travel (Du lịch)', 'Marketing (Quảng cáo)', 
      'Finance (Tài chính)', 'Technology (Công nghệ)', 'Health (Sức khỏe)', 
      'Shopping (Mua sắm)', 'Entertainment (Giải trí)', 'Transportation (Giao thông)', 'Personnel (Nhân sự)'
    ][i] || 'Chủ đề Từ vựng'}`,
    status: ['Chưa làm', 'Đã làm', 'Đang làm'][i % 3],
    score: i % 3 === 1 ? `${7 + (i % 3)}/10` : '0/10'
  }));

  const exerciseData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Đề Luyện tập số ${i + 1}`,
    status: ['Đang làm', 'Chưa làm', 'Đã làm'][i % 3],
    score: i % 3 === 2 ? `${9 + (i % 2)}/10` : '0/10'
  }));

  const renderCards = (dataList) => {
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

              {item.status === 'Đã làm' ? (
                <button 
                  style={{ border: `1px solid ${BRAND}`, color: BRAND }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-transparent hover:bg-green-50 transition duration-150"
                >
                  Xem lại bài
                </button>
              ) : (
                <button 
                  style={{ backgroundColor: BRAND }}
                  className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150"
                >
                  Làm bài
                </button>
              )}
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
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">
              Grammar (Ngữ pháp)
            </h2>
            {renderCards(grammarData)}
          </div>
        );

      case 'Từ vựng':
        return (
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">
              Vocabulary (Từ vựng)
            </h2>
            {renderCards(vocabularyData)}
          </div>
        );

      case 'Bài tập':
        return (
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">
              Exercises (Bài tập)
            </h2>
            {renderCards(exerciseData)}
          </div>
        );

      default:
        return <p className="text-gray-500">Đang tải dữ liệu...</p>;
    }
  };

  return (
    // Thêm className của roboto vào thẻ cha ngoài cùng để áp dụng đồng bộ font toàn trang
    <div className={`min-h-screen bg-gray-50 flex flex-col ${roboto.className}`}>

      {/* ===== TOOLBAR TRÊN CÙNG ===== */}
      <header
        style={{ backgroundColor: BRAND }}
        className="shadow-md px-6 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50"
      >
        <span className="text-white font-bold text-xl tracking-wide">
          TOEIC Thầy Băng
        </span>

        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">
            Hellu babe
          </span>
          <button
            onClick={handleLogout}
            style={{ color: BRAND }}
            className="bg-white font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-green-50 transition duration-200 shadow-sm"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* ===== LAYOUT CHÍNH ===== */}
      <div className="flex flex-1 pt-14">

        {/* ===== SIDEBAR BÊN TRÁI ===== */}
        <aside
          style={{ backgroundColor: BRAND }}
          className="w-48 shadow-lg flex flex-col py-6 px-3 gap-1 fixed left-0 top-14 bottom-0 overflow-y-auto"
        >
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveMenu(item)}
              style={activeMenu === item ? { color: BRAND } : {}}
              className={`text-left w-full px-4 py-3 rounded-lg text-sm font-semibold transition duration-150
                ${activeMenu === item
                  ? 'bg-white shadow-sm'
                  : 'text-white hover:bg-white/20'
                }`}
            >
              {item}
            </button>
          ))}
        </aside>

        {/* ===== NỘI DUNG CHÍNH ===== */}
        <main className="flex-1 p-8 ml-48">
          <div className="max-w-5xl mx-auto rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-4">
              Trang chủ / <span style={{ color: BRAND }} className="font-medium">{activeMenu}</span>
            </p>

            <div className="mt-2">
              {renderContent()}
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}