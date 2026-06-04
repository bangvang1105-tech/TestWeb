'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Thêm thư viện để điều hướng trang

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Thêm state để hiển thị lỗi khi nhập sai
  const router = useRouter(); // Khởi tạo router

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(''); // Reset lại lỗi trước khi kiểm tra

    // Kiểm tra tài khoản tạm thời (Tài khoản: try / Mật khẩu: try)
    if (email === 'try' && password === 'try') {
      // Nếu đúng, điều hướng qua trang chủ (/home)
      router.push('/home');
    } else {
      // Nếu sai, hiển thị thông báo lỗi
      setError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Tiêu đề */}
        <h2 className="mb-2 text-center text-3xl font-bold tracking-tight text-gray-800">
          Đăng Nhập
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          Sử dụng tài khoản <span className="font-semibold text-gray-700">try</span> và mật khẩu <span className="font-semibold text-gray-700">try</span> để thử nghiệm
        </p>

        {/* Hiển thị thông báo lỗi nếu đăng nhập sai */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* Form Đăng Nhập */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ô nhập Tài khoản */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tài khoản (hoặc Email)
            </label>
            <input
              type="text" // Đổi từ email thành text để bạn dễ gõ chữ "try"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập tài khoản"
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

          {/* Nút Đăng nhập */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}