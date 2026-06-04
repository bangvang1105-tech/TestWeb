'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, getFirestore } from 'firebase/firestore'; // Import các hàm xử lý Firestore
import { auth } from '@/firebase'; // File cấu hình Firebase hiện tại của bạn
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [email, setEmail] = useState(''); // State đóng vai trò là "Tài khoản"
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Trạng thái chờ khi đang check database
  const router = useRouter();
  
  // Khởi tạo instance của Firestore dựa trên cấu hình Firebase của bạn
  const db = getFirestore(auth.app);

  // Xử lý khi người dùng nhấn nút Đăng nhập kết nối Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 
    setLoading(true); // Bật trạng thái loading khi bắt đầu gửi request lên database

    try {
      // 1. Trỏ thẳng tới Document có ID chính là tên tài khoản trong Collection 'users'
      const userRef = doc(db, 'users', email.trim());
      const docSnap = await getDoc(userRef);

      // 2. Kiểm tra xem Document (tài khoản) này có tồn tại không
      if (!docSnap.exists()) {
        setError('Tài khoản không tồn tại trên hệ thống!');
        setLoading(false);
        return;
      }

      const userData = docSnap.data();

      // 3. Kiểm tra mật khẩu (So sánh chuỗi văn bản thuần)
      if (userData.matKhau !== password) {
        setError('Mật khẩu không chính xác!');
        setLoading(false);
        return;
      }

      // 4. ĐĂNG NHẬP THÀNH CÔNG -> Lưu thông tin vào Cookie để Header đọc
      Cookies.set('isLoggedIn', 'true', { expires: 7 }); // Hết hạn sau 7 ngày
      
      const infoToSave = {
        ten: `${userData.ho} ${userData.ten}`,
        vaiTro: userData.vaiTro, // 'giaoVien' hoặc 'hocsinh'
        taiKhoan: userData.taiKhoan
      };
      Cookies.set('userInfo', JSON.stringify(infoToSave), { expires: 7 });

      // 5. Điều hướng trang dựa trên vai trò (Role-based Routing)
      if (userData.vaiTro === 'giaoVien') {
        router.push('/admin/dashboard'); // Nếu là giáo viên, dẫn thẳng tới trang quản trị bài tập
      } else {
        router.push('/trang-chu'); // Nếu là học sinh, dẫn về trang làm bài tập
      }

    } catch (err) {
      console.error("Lỗi đăng nhập hệ thống:", err);
      setError('Đã xảy ra lỗi khi kết nối dữ liệu. Vui lòng thử lại!');
    } finally {
      setLoading(false); // Tắt loading sau khi xử lý xong xuôi
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-12">
      
      {/* Khung Form Đăng nhập chính */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Tiêu đề */}
        <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-gray-800">
          Đăng Nhập
        </h2>

        {/* Thông báo lỗi (Chỉ hiện khi có lỗi nhập liệu hoặc lỗi hệ thống) */}
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
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập tên tài khoản"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
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
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
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
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 flex justify-center items-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xác thực...
              </span>
            ) : 'Đăng nhập'}
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