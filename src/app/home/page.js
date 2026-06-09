'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

const BRAND = '#4ade80';

const VOCAB_TOPICS = [
  { id: 1, title: 'Hợp đồng & Đàm phán', subtitle: 'Contracts' },
  { id: 2, title: 'Marketing & Quảng cáo', subtitle: 'Marketing' },
  { id: 3, title: 'Phát triển doanh nghiệp', subtitle: 'Business' },
  { id: 4, title: 'Hội nghị & Sự kiện', subtitle: 'Conferences' },
  { id: 5, title: 'Tuyển dụng & Nhân sự', subtitle: 'Employment' },
  { id: 6, title: 'Mua sắm & Đặt hàng', subtitle: 'Purchasing' },
  { id: 7, title: 'Ngân hàng & Tài chính', subtitle: 'Banking' },
  { id: 8, title: 'Kế toán & Thuế', subtitle: 'Accounting' },
  { id: 9, title: 'Quản lý văn phòng', subtitle: 'Office Corporate' },
  { id: 10, title: 'Quản lý nhân viên', subtitle: 'Personnel' },
  { id: 11, title: 'Du lịch & Khách sạn', subtitle: 'Travel' },
  { id: 12, title: 'Giải trí & Ăn uống', subtitle: 'Entertainment' },
  { id: 13, title: 'Sức khỏe & Y tế', subtitle: 'Health' },
];

const VOCAB_SUBMENU = [
  { key: 'learn', label: 'Học từ vựng', icon: '📖' },
  { key: 'flashcard', label: 'Flashcards', icon: '🃏' },
  { key: 'quiz', label: 'Trắc nghiệm từ vựng', icon: '✏️' },
  { key: 'match', label: 'Tìm cặp', icon: '🔗' },
  { key: 'listen', label: 'Nghe từ vựng', icon: '🎧' },
];

// 🌟 THÊM MỚI: Cấu hình Submenu cho Ngữ pháp
const GRAMMAR_SUBMENU = [
  { key: 'video', label: 'Video bài giảng', icon: '📺' },
  { key: 'slide', label: 'Slide bài giảng', icon: '📊' },
];

// 🌟 THÊM MỚI: 12 Chủ đề ngữ pháp thực tế của bạn
const GRAMMAR_TOPICS = [
  { id: 1, title: 'Từ loại', subtitle: 'Parts of Speech' },
  { id: 2, title: 'Từ hạn định & Mạo từ', subtitle: 'Determiners & Articles' },
  { id: 3, title: 'Các Thì', subtitle: 'Tenses' },
  { id: 4, title: 'Đại từ', subtitle: 'Pronouns' },
  { id: 5, title: 'Câu bị động', subtitle: 'Passive Voice' },
  { id: 6, title: 'Câu tường thuật', subtitle: 'Reported Speech' },
  { id: 7, title: 'Câu điều kiện', subtitle: 'Conditional Sentences' },
  { id: 8, title: 'Mệnh đề quan hệ', subtitle: 'Relative Clauses' },
  { id: 9, title: 'Giới từ', subtitle: 'Prepositions' },
  { id: 10, title: 'Liên từ', subtitle: 'Conjunctions' },
  { id: 11, title: 'Cấu tạo câu', subtitle: 'Sentence Structures' },
  { id: 12, title: 'Hòa hợp chủ vị', subtitle: 'Subject-Verb Agreement' },
];

export default function HomePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('Tổng quan');
  const [vocabSubMenu, setVocabSubMenu] = useState(null); 
  const [grammarSubMenu, setGrammarSubMenu] = useState(null); // 🌟 THÊM MỚI: Quản lý trạng thái submenu ngữ pháp
  const [userProgress, setUserProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(true);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (!CURRENT_USER_ID) {
      router.push('/');
      return;
    }

    async function fetchProgress() {
      try {
        setLoadingProgress(true);
        const querySnapshot = await getDocs(
          collection(db, 'users', CURRENT_USER_ID, 'progress')
        );
        const progressMap = {};
        querySnapshot.forEach((docSnap) => {
          progressMap[docSnap.id] = docSnap.data();
        });
        setUserProgress(progressMap);
      } catch (err) {
        console.error("Lỗi đồng bộ tiến trình học viên: ", err);
      } finally {
        setLoadingProgress(false);
      }
    }
    fetchProgress();
  }, [activeMenu, CURRENT_USER_ID, router]);

  const menuItems = ['Tổng quan', 'Khóa học', 'Ngữ pháp', 'Từ vựng', 'Bài tập'];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId');
    }
    router.push('/');
  };

  const handleMenuClick = (item) => {
    setActiveMenu(item);
    if (item !== 'Từ vựng') setVocabSubMenu(null);
    if (item !== 'Ngữ pháp') setGrammarSubMenu(null); // 🌟 Reset menu ngữ pháp nếu bấm mục khác
  };

  // Nộp data luyện tập (Giữ nguyên cho phân hệ 'Bài tập')
  const rawExerciseData = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Đề Luyện tập số ${i + 1}`
  }));

  const buildDisplayData = (rawData, prefixType) => {
    return rawData.map(item => {
      const targetLessonId = `${prefixType}_${item.id}`;
      const progress = userProgress[targetLessonId];
      let status = 'Chưa làm';
      let scoreText = '0/10';
      if (progress) {
        if (progress.status === 'completed') {
          status = 'Đã làm';
          scoreText = `${progress.score}/${progress.totalQuestions || 10}`;
        } else if (progress.status === 'in_progress') {
          status = 'Đang làm';
          scoreText = `0/${progress.totalQuestions || 10}`;
        }
      }
      return { ...item, status, score: scoreText };
    });
  };

  const handleNavigation = (type, id) => {
    router.push(`/lesson?type=${type}&id=${id}`);
  };

  const handleVocabTopicNavigation = (mode, topicId) => {
    router.push(`/vocabulary?mode=${mode}&topic=${topicId}`);
  };

  // 🌟 THÊM MỚI: Điều hướng sang trang chi tiết Ngữ pháp mới
  const handleGrammarTopicNavigation = (mode, topicId) => {
    router.push(`/grammar?mode=${mode}&topic=${topicId}`);
  };

  const renderCards = (rawDataList, type) => {
    if (!rawDataList || !Array.isArray(rawDataList)) {
      return <p className="text-gray-400 text-xs mt-4">Không tìm thấy danh sách cấu hình dữ liệu.</p>;
    }
    if (loadingProgress) {
      return <p className="text-gray-400 text-xs mt-4">Đang tải dữ liệu học tập...</p>;
    }
    const dataList = buildDisplayData(rawDataList, type);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {dataList.map((item) => (
          <div
            key={item.id}
            className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200"
          >
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-gray-800 text-sm line-clamp-1 flex-1">{item.title}</h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">Điểm: {item.score}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-md
                ${item.status === 'Đã làm' ? 'bg-green-100 text-green-700' : ''}
                ${item.status === 'Đang làm' ? 'bg-amber-100 text-amber-700' : ''}
                ${item.status === 'Chưa làm' ? 'bg-gray-100 text-gray-500' : ''}
              `}>{item.status}</span>
              <div className="flex items-center gap-2">
                {item.status === 'Chưa làm' && (
                  <button onClick={() => handleNavigation(type, item.id)} style={{ backgroundColor: BRAND }} className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150">Làm bài</button>
                )}
                {item.status === 'Đang làm' && (
                  <button onClick={() => handleNavigation(type, item.id)} style={{ backgroundColor: BRAND }} className="text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition duration-150 whitespace-nowrap">Tiếp tục làm bài</button>
                )}
                {item.status === 'Đã làm' && (
                  <>
                    <button onClick={() => handleNavigation(type, item.id)} style={{ border: `1px solid ${BRAND}`, color: BRAND }} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-transparent hover:bg-green-50 transition duration-150 whitespace-nowrap">Xem lại bài</button>
                    <button onClick={() => handleNavigation(type, item.id)} style={{ backgroundColor: BRAND }} className="text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition duration-150 whitespace-nowrap">Làm lại bài</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render vocab topic cards (Giữ nguyên)
  const renderVocabTopicCards = (mode) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {VOCAB_TOPICS.map((topic) => (
          <div
            key={topic.id}
            className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{topic.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{topic.subtitle}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">
                Chủ đề {topic.id}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500">Chưa học</span>
              <button
                onClick={() => handleVocabTopicNavigation(mode, topic.id)}
                style={{ backgroundColor: BRAND }}
                className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150"
              >
                Bắt đầu
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 🌟 THÊM MỚI: Render danh sách 12 thẻ bài học Ngữ pháp
  const renderGrammarTopicCards = (mode) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {GRAMMAR_TOPICS.map((topic) => (
          <div
            key={topic.id}
            className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{topic.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{topic.subtitle}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">
                Bài {topic.id}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500">Chưa học</span>
              <button
                onClick={() => handleGrammarTopicNavigation(mode, topic.id)}
                style={{ backgroundColor: BRAND }}
                className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150"
              >
                Xem ngay
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'Tổng quan':
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tiến trình học tập</h2>
            <p className="text-gray-600 text-sm">Chào mừng bạn quay trở lại lớp học của Thầy Băng. Chọn các mục bên thanh điều hướng để bắt đầu học tập.</p>
          </div>
        );
      case 'Khóa học':
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Khóa học của bạn</h2>
            <p className="text-gray-600 text-sm">Danh sách các khóa học TOEIC trực tuyến.</p>
          </div>
        );
      case 'Ngữ pháp':
        // 🌟 THÊM MỚI: Quản lý logic hiển thị phân hệ Ngữ Pháp
        if (!grammarSubMenu) {
          return (
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-2">Grammar (Ngữ pháp)</h2>
              <p className="text-gray-500 text-sm mb-6">Chọn hình thức học ngữ pháp bạn muốn tiếp cận.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {GRAMMAR_SUBMENU.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => setGrammarSubMenu(sub.key)}
                    className="flex flex-col items-start gap-2 p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition duration-200 text-left"
                  >
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="font-bold text-gray-800 text-sm">{sub.label}</span>
                    <span className="text-xs text-gray-400">12 chủ đề trọng tâm</span>
                  </button>
                ))}
              </div>
            </div>
          );
        } else {
          const subInfo = GRAMMAR_SUBMENU.find(s => s.key === grammarSubMenu);
          return (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setGrammarSubMenu(null)}
                  className="text-xs text-gray-400 hover:text-green-600 transition"
                >← Ngữ pháp</button>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold" style={{ color: BRAND }}>{subInfo?.label}</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">
                {subInfo?.icon} {subInfo?.label}
              </h2>
              <p className="text-gray-500 text-sm mb-4">Chọn bài học ngữ pháp bạn muốn học.</p>
              {renderGrammarTopicCards(grammarSubMenu)}
            </div>
          );
        }
      case 'Từ vựng':
        if (!vocabSubMenu) {
          return (
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-2">Vocabulary (Từ vựng)</h2>
              <p className="text-gray-500 text-sm mb-6">Chọn hình thức học từ vựng bạn muốn thực hành.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {VOCAB_SUBMENU.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => setVocabSubMenu(sub.key)}
                    className="flex flex-col items-start gap-2 p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition duration-200 text-left"
                  >
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="font-bold text-gray-800 text-sm">{sub.label}</span>
                    <span className="text-xs text-gray-400">13 chủ đề TOEIC</span>
                  </button>
                ))}
              </div>
            </div>
          );
        } else {
          const subInfo = VOCAB_SUBMENU.find(s => s.key === vocabSubMenu);
          return (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setVocabSubMenu(null)}
                  className="text-xs text-gray-400 hover:text-green-600 transition"
                >← Từ vựng</button>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold" style={{ color: BRAND }}>{subInfo?.label}</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">
                {subInfo?.icon} {subInfo?.label}
              </h2>
              <p className="text-gray-500 text-sm mb-4">Chọn chủ đề từ vựng bạn muốn luyện tập.</p>
              {renderVocabTopicCards(vocabSubMenu)}
            </div>
          );
        }
      case 'Bài tập':
        return (
          <div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">Exercises (Bài tập)</h2>
            {renderCards(rawExerciseData, 'exercise')}
          </div>
        );
      default:
        return <p className="text-gray-500">Đang tải dữ liệu...</p>;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${roboto.className}`}>
      {/* HEADER */}
      <header style={{ backgroundColor: BRAND }} className="shadow-md px-6 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
        <span className="text-white font-bold text-xl tracking-wide">TOEIC Thầy Băng</span>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">Xin chào, {CURRENT_USER_ID}!</span>
          <button onClick={handleLogout} style={{ color: BRAND }} className="bg-white font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-green-50 transition duration-200 shadow-sm">Đăng xuất</button>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* SIDEBAR */}
        <aside style={{ backgroundColor: BRAND }} className="w-48 shadow-lg flex flex-col py-6 px-3 gap-1 fixed left-0 top-14 bottom-0 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item}>
              <button
                onClick={() => handleMenuClick(item)}
                style={activeMenu === item ? { color: BRAND } : {}}
                className={`text-left w-full px-4 py-3 rounded-lg text-sm font-semibold transition duration-150
                  ${activeMenu === item ? 'bg-white shadow-sm' : 'text-white hover:bg-white/20'}`}
              >
                {item}
              </button>

              {/* 🌟 THÊM MỚI: Submenu Ngữ pháp hiển thị trực tiếp ở sidebar khi active */}
              {item === 'Ngữ pháp' && activeMenu === 'Ngữ pháp' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {GRAMMAR_SUBMENU.map((sub) => (
                    <button
                      key={sub.key}
                      onClick={() => setGrammarSubMenu(sub.key)}
                      className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5
                        ${grammarSubMenu === sub.key
                          ? 'bg-white/90 text-green-800 font-bold shadow-sm'
                          : 'text-white/90 hover:bg-white/20'
                        }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Submenu Từ vựng */}
              {item === 'Từ vựng' && activeMenu === 'Từ vựng' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {VOCAB_SUBMENU.map((sub) => (
                    <button
                      key={sub.key}
                      onClick={() => setVocabSubMenu(sub.key)}
                      className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5
                        ${vocabSubMenu === sub.key
                          ? 'bg-white/90 text-green-800 font-bold shadow-sm'
                          : 'text-white/90 hover:bg-white/20'
                        }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 ml-48">
          <div className="max-w-5xl mx-auto rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-4">
              Trang chủ / <span style={{ color: BRAND }} className="font-medium">{activeMenu}</span>
              {grammarSubMenu && activeMenu === 'Ngữ pháp' && (
                <> / <span style={{ color: BRAND }} className="font-medium">{GRAMMAR_SUBMENU.find(s => s.key === grammarSubMenu)?.label}</span></>
              )}
              {vocabSubMenu && activeMenu === 'Từ vựng' && (
                <> / <span style={{ color: BRAND }} className="font-medium">{VOCAB_SUBMENU.find(s => s.key === vocabSubMenu)?.label}</span></>
              )}
            </p>
            <div className="mt-2">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}