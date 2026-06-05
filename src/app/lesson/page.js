'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const BRAND = '#4ade80';

const TYPE_LABEL = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  exercise: 'Bài tập',
};

function LessonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get('type');
  const id = searchParams.get('id');

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col items-center justify-center ${roboto.className}`}>
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Trang bài học
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          Loại: <strong>{TYPE_LABEL[type] ?? type}</strong>
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Bài số: <strong>{id}</strong>
        </p>
        <p className="text-gray-400 text-xs mb-8">
          (Nội dung sẽ được thêm sau)
        </p>
        <button
          onClick={() => router.back()}
          style={{ backgroundColor: BRAND }}
          className="text-white font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition"
        >
          ← Quay lại
        </button>
      </div>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Đang tải...</div>}>
      <LessonContent />
    </Suspense>
  );
}