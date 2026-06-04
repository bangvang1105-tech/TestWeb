'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase'; // Import cấu hình Firebase Auth từ file src/firebase.js

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [firebaseStatus, setFirebaseStatus] = useState('Đang kiểm tra kết nối Firebase...');
  const router = useRouter();

// Kiểm tra kết nối tới Firebase khi trang web vừa tải xong
  useEffect(() => {
    // Chỉ cần đối tượng auth tồn tại và app được khởi tạo thành công là đạt yêu cầu
    if (auth && auth.app) {
      setFirebaseStatus(`✅ Kết nối Firebase thành công! (Project: ${auth.app.options.projectId})`);
      console.log("Firebase App Object:", auth.app);
    } else {
      setFirebaseStatus('❌ Kết nối Firebase thất bại. Vui lòng kiểm tra lại file .env.local');
    }
  }, []);

  // Xử lý khi người dùng nhấn nút Đăng nhập
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(''); // Reset lại thông báo lỗi trước đó

    // Kiểm tra tài khoản tạm thời (Tài khoản: try / Mật khẩu: try)
    if (email === 'try' && password === 'try') {
      // Nếu đúng, điều hướng qua trang chủ (/home)
      router.push('/home');
    } else {
      // Nếu sai, hiển thị thông báo lỗi lên màn hình
      setError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-12">
      
      {/* 1. Thanh hiển thị trạng thái kết nối Firebase */}
      <div className={`mb-4 w-full max-w-md p-3 text-center text-sm font-medium rounded-xl border shadow-sm transition-all ${
        firebaseStatus.includes('✅') 
          ? 'bg-green-50 text-green-700 border-green-200' 
          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
      }`}>
        {firebaseStatus}
      </div>

      {/* 2. Khung Form Đăng nhập chính */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Tiêu đề */}
        <h2 className="mb-2 text-center text-3xl font-bold tracking-tight text-gray-800">
          Đăng Nhập
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          Sử dụng tài khoản <span className="font-semibold text-gray-700">try</span> và mật khẩu <span className="font-semibold text-gray-700">try</span> để thử nghiệm
        </p>

        {/* Thông báo lỗi (Chỉ hiển thị khi người dùng nhập sai tài khoản/mật khẩu) */}
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ô nhập Tài khoản */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tài khoản
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập tên tài khoản"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Ô nhập Mật khẩu */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Ghi nhớ & Quên mật khẩu */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-600">
              <input type="checkbox" className="mr-2 rounded border-gray-300 text-blue-600" />
              Ghi nhớ đăng nhập
            </label>
            <a href="#" className="font-medium text-blue-600 hover:underline">
              Quên mật khẩu?
            </a>
          </div>

          {/* Nút submit Đăng nhập */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Đăng nhập
          </button>
        </form>

        {/* Chuyển hướng nhanh sang Đăng ký */}
        <p className="mt-8 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <a href="#" className="font-medium text-blue-600 hover:underline">
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  );
}