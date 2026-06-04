'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState('Đang kiểm tra kết nối Firebase...');
  const router = useRouter();

  // Kiểm tra kết nối tới Firebase khi trang web vừa tải xong
  useEffect(() => {
    if (auth && auth.app) {
      setFirebaseStatus(`Bạn đã sẵn sàng đạt 990 TOEIC cùng khầy Băng rồi chứ =)`);
    } else {
      setFirebaseStatus('Bạn đã sẵn sàng đạt 990 TOEIC cùng khầy Băng rồi chứ =)');
    }
  }, []);

  // Xử lý khi người dùng nhấn nút Đăng nhập
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const db = getFirestore(auth.app);

      // Truy vấn document có ID trùng với username người dùng nhập
      const userDocRef = doc(db, 'users', username);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // Kiểm tra password có khớp không
        if (userData.password === password) {
          // Đăng nhập thành công → điều hướng sang trang chủ
          router.push('/home');
        } else {
          setError('Tài khoản hoặc mật khẩu không chính xác!');
        }
      } else {
        // Không tìm thấy document với username đó
        setError('Tài khoản hoặc mật khẩu không chính xác!');
      }
    } catch (err) {
      console.error('Lỗi khi đăng nhập:', err);
      setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
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
          Nhập tài khoản và mật khẩu của bạn để tiếp tục
        </p>

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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            disabled={loading}
            className="w-full rounded-lg bg-green-500 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          >
            {loading ? 'Đang kiểm tra...' : 'Đăng nhập'}
          </button>

          {/* Thông báo lỗi — hiển thị ngay dưới nút đăng nhập */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600 border border-red-200">
              {error}
            </div>
          )}
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