'use client';

import { useState, useEffect } from 'react'; // Thêm useEffect
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase'; // Nhập cấu hình auth từ file firebase.js bạn tạo lúc nãy

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [firebaseStatus, setFirebaseStatus] = useState('Đang kiểm tra kết nối...'); // Trạng thái test Firebase
  const router = useRouter();

  useEffect(() => {
    // Kiểm tra xem đối tượng auth của Firebase có tồn tại và đọc đúng Project ID không
    if (auth && auth.config && auth.config.projectId) {
      setFirebaseStatus(`✅ Kết nối Firebase thành công! (Project: ${auth.config.projectId})`);
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 flex-col gap-4">
      
      {/* Thanh thông báo trạng thái Firebase đặt trên cùng của Form */}
      <div className={`w-full max-w-md p-3 rounded-xl text-sm font-medium text-center shadow-sm border ${
        firebaseStatus.includes('✅') 
          ? 'bg-green-50 text-green-700 border-green-200' 
          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
      }`}>
        {firebaseStatus}
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Giữ nguyên toàn bộ phần cấu trúc Form đăng nhập bên dưới của bạn... */}