export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Chào mừng bạn đến với Trang Chủ!
        </h1>
        <p className="text-gray-600">
          Bạn đã đăng nhập thành công bằng tài khoản thử nghiệm. Đây là trang chủ trống, bạn có thể thoải mái thêm các thành phần giao diện (LMS, danh sách công việc, hay biểu đồ...) vào file này sau.
        </p>
        
        {/* Vùng trống để bạn thêm code sau này */}
        <div className="mt-8 border-2 border-dashed border-gray-200 rounded-lg h-64 flex items-center justify-center text-gray-400 text-sm">
          Không gian thiết kế giao diện của bạn nằm ở đây
        </div>
      </div>
    </div>
  );
}