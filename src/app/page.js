'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';

// Màu neon ấm dùng chung — chỉnh 1 chỗ này là áp dụng toàn trang
const BRAND = '#3dbe7a';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [firebaseStatus, setFirebaseStatus] = useState('Đang kiểm tra kết nối Firebase...');
  const router = useRouter();

  useEffect(() => {
    if (auth && auth.app) {
      setFirebaseStatus(`✅ Kết nối Firebase thành công! (Project: ${auth.app.options.projectId})`);
      console.log("Firebase App Object:", auth.app);
    } else {
      setFirebaseStatus('❌ Kết nối Firebase thất bại. Vui lòng kiểm tra lại file .env.local');
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (email === 'try' && password === 'try') {
      router.push('/home');
    } else {
      setError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-12">

      {/* Thanh trạng thái Firebase */}
      <div className={`mb-4 w-full max-w-md p-3 text-center text-sm font-medium rounded-xl border shadow-sm transition-all ${
        firebaseStatus.includes('✅')
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
      }`}>
        {firebaseStatus}
      </div>

      {/* Form đăng nhập */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-center text-3xl font-bold tracking-tight text-gray-800">
          Đăng Nhập
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          Sử dụng tài khoản <span className="font-semibold text-gray-700">try</span> và mật khẩu{' '}
          <span className="font-semibold text-gray-700">try</span> để thử nghiệm
        </p>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': BRAND }}
              onFocus={(e) => e.target.style.borderColor = BRAND}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

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
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
              onFocus={(e) => e.target.style.borderColor = BRAND}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-600">
              <input type="checkbox" className="mr-2 rounded border-gray-300" />
              Ghi nhớ đăng nhập
            </label>
            <a href="#" style={{ color: BRAND }} className="font-medium hover:underline">
              Quên mật khẩu?
            </a>
          </div>

          {/* Nút đăng nhập — màu neon ấm */}
          <button
            type="submit"
            style={{ backgroundColor: BRAND }}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition duration-200 shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Đăng nhập
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <a href="#" style={{ color: BRAND }} className="font-medium hover:underline">
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  );
}