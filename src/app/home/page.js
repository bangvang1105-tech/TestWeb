'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Màu neon ấm dùng chung — chỉnh 1 chỗ này là áp dụng toàn trang
const BRAND = '#4ade80';

export default function HomePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('Tổng quan');

  const menuItems = ['Tổng quan', 'Khóa học', 'Ngữ pháp', 'Từ vựng', 'Bài tập'];

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

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
          <div className="max-w-4xl mx-auto rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Chào mừng bạn đến với Trang Chủ!
            </h1>
            <p className="text-gray-600">
              Bạn đang xem mục:{' '}
              <span style={{ color: BRAND }} className="font-semibold">{activeMenu}</span>
            </p>

            <div className="mt-8 border-2 border-dashed border-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-400 text-sm">
              Không gian thiết kế giao diện của bạn nằm ở đây
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}