'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginKey = email.trim(); 
      const userRef = doc(db, 'users', loginKey);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError('Tài khoản không tồn tại!');
        setLoading(false);
        return;
      }

      const userData = userSnap.data();

      if (userData.matKhau !== password) {
        setError('Mật khẩu không chính xác!');
        setLoading(false);
        return;
      }

      localStorage.setItem('userId', loginKey);
      router.push('/home');
    } catch (err) {
      setError('Đã có lỗi xảy ra, vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 antialiased">
      {/* Thanh thông báo */}
      <div className="mb-4 w-full max-w-md p-3.5 text-center text-sm font-semibold rounded-xl border shadow-sm bg-green-50 border-green-200 text-green-600">
        Bạn đã sẵn sàng đạt 990 TOEIC cùng khầy Băng rồi chứ =)
      </div>

      {/* Khung Form Đăng nhập */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">
        <h2 className="mb-2 text-center text-3xl font-black tracking-tight text-gray-800">
          Đăng Nhập
        </h2>
        <p className="mb-6 text-center text-sm text-gray-400 font-medium">
          Nhập tài khoản và mật khẩu để tiếp tục hành trình
        </p>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-600 border border-red-200">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Tài khoản
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập tên tài khoản của bạn"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:bg-white focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:bg-white focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <label className="flex items-center text-gray-500 cursor-pointer select-none">
              <input type="checkbox" className="mr-2 rounded border-gray-300 text-green-400 focus:ring-green-400/20" />
              Ghi nhớ đăng nhập
            </label>
            <a href="#" className="hover:underline text-green-500">
              Quên mật khẩu?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-400 py-3.5 text-sm font-bold text-white shadow-sm shadow-green-400/20 transition hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-green-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xác thực thông tin...' : 'Đăng nhập ngay'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-medium text-gray-500">
          Chưa có tài khoản học viên?{' '}
          <a href="#" className="font-bold hover:underline text-green-500">
            Đăng ký tham gia ngay
          </a>
        </p>
      </div>
    </div>
  );
}