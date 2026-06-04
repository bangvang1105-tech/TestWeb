'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Đây là nơi xử lý logic đăng nhập sau này (gọi API, kiểm tra tài khoản...)
    console.log('Đăng nhập với:', { email, password });
    alert(`Đang xử lý đăng nhập cho: ${email}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Tiêu đề */}
        <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-gray-800">
          Đăng Nhập
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          Vui lòng nhập tài khoản của bạn để tiếp tục
        </p>

        {/* Form Đăng Nhập */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ô nhập Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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

          {/* Nút Đăng nhập */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Đăng nhập
          </button>
        </form>

        {/* Chuyển sang Đăng ký */}
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