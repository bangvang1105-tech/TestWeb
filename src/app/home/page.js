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

const GRAMMAR_SUBMENU = [
  { key: 'video', label: 'Video bài giảng', icon: '📺' },
  { key: 'slide', label: 'Slide bài giảng', icon: '📊' },
];

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

const EXERCISE_SKILLS = [
  { key: 'listening', label: 'Kỹ năng Nghe', icon: '🎧' },
  { key: 'reading', label: 'Kỹ năng Đọc', icon: '📖' },
];

const EXERCISE_PARTS = {
  listening: [
    { key: 'dictation_p1', label: 'Nghe chép chính tả Part 1', detail: 'Hình ảnh (Photos)' },
    { key: 'dictation_p2', label: 'Nghe chép chính tả Part 2', detail: 'Hỏi & Đáp (Question - Response)' },
    { key: 'dictation_p3', label: 'Nghe chép chính tả Part 3', detail: 'Hội thoại ngắn (Short Conversations)' },
    { key: 'dictation_p4', label: 'Nghe chép chính tả Part 4', detail: 'Bài nói ngắn (Short Talks)' },
  ],
  reading: [
    { key: 'quiz_p5', label: 'Trắc nghiệm Part 5', detail: 'Câu chưa hoàn chỉnh (Incomplete Sentences)' },
    { key: 'quiz_p6', label: 'Trắc nghiệm Part 6', detail: 'Hoàn thành đoạn văn (Text Completion)' },
    { key: 'quiz_p7', label: 'Trắc nghiệm Part 7', detail: 'Đọc hiểu đoạn văn (Reading Comprehension)' },
  ]
};

// 🌟 THÊM MỚI: Danh sách các bộ giáo trình Luyện Đề (Menu cấp 2)
const EXAM_BOOKS = [
  { key: 'ets2023', label: 'ETS 2023', icon: '📚' },
  { key: 'ets2024', label: 'ETS 2024', icon: '📗' },
  { key: 'ets2026', label: 'ETS 2026', icon: '📘' },
  { key: 'hacker2', label: 'Hacker 2', icon: '📙' },
  { key: 'hacker3', label: 'Hacker 3', icon: '📕' },
];

export default function HomePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('Tổng quan');
  const [vocabSubMenu, setVocabSubMenu] = useState(null); 
  const [grammarSubMenu, setGrammarSubMenu] = useState(null); 
  
  const [exerciseSkill, setExerciseSkill] = useState(null); 
  const [exercisePart, setExercisePart] = useState(null);   

  // 🌟 THÊM MỚI: Trạng thái quản lý phân cấp Luyện Đề
  const [examBook, setExamBook] = useState(null); // Lưu bộ sách đang chọn (Ví dụ: ets2024)

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

  // 🌟 THÊM MỚI: Bổ sung "Luyện đề" vào mảng menu chính
  const menuItems = ['Tổng quan', 'Khóa học', 'Ngữ pháp', 'Từ vựng', 'Bài tập', 'Luyện đề'];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId');
    }
    router.push('/');
  };

  const handleMenuClick = (item) => {
    setActiveMenu(item);
    if (item !== 'Từ vựng') setVocabSubMenu(null);
    if (item !== 'Ngữ pháp') setGrammarSubMenu(null);
    if (item !== 'Bài tập') {
      setExerciseSkill(null);
      setExercisePart(null);
    }
    if (item !== 'Luyện đề') {
      // 🌟 Reset trạng thái luyện đề khi nhảy menu khác
      setExamBook(null);
    }
  };

  const handleNavigation = (type, id) => {
    router.push(`/lesson?type=${type}&id=${id}`);
  };

  const handleVocabTopicNavigation = (mode, topicId) => {
    router.push(`/vocabulary?mode=${mode}&topic=${topicId}`);
  };

  const handleGrammarTopicNavigation = (mode, topicId) => {
    router.push(`/grammar?mode=${mode}&topic=${topicId}`);
  };

  const handleExerciseNavigation = (partKey) => {
    router.push(`/exercise?part=${partKey}`);
  };

  // 🌟 THÊM MỚI: Hàm điều hướng khi làm đề thi thử (10 bộ TEST)
  const handleExamNavigation = (bookKey, testId) => {
    router.push(`/exam?book=${bookKey}&test=${testId}`);
  };

  const renderVocabTopicCards = (mode) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {VOCAB_TOPICS.map((topic) => (
          <div key={topic.id} className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{topic.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{topic.subtitle}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">Chủ đề {topic.id}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500">Chưa học</span>
              <button onClick={() => handleVocabTopicNavigation(mode, topic.id)} style={{ backgroundColor: BRAND }} className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150">Bắt đầu</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGrammarTopicCards = (mode) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {GRAMMAR_TOPICS.map((topic) => (
          <div key={topic.id} className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{topic.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{topic.subtitle}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">Bài {topic.id}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500">Chưa học</span>
              <button onClick={() => handleGrammarTopicNavigation(mode, topic.id)} style={{ backgroundColor: BRAND }} className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150">Xem ngay</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderExercisePartCards = (skillKey) => {
    const parts = EXERCISE_PARTS[skillKey] || [];
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {parts.map((part) => (
          <div key={part.key} className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{part.label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{part.detail}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500">Chưa làm</span>
              <button onClick={() => handleExerciseNavigation(part.key)} style={{ backgroundColor: BRAND }} className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150">Vào luyện tập</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 🌟 THÊM MỚI: Render 10 thẻ TEST cho bộ đề thi được lựa chọn
  const renderExamTestCards = (bookKey) => {
    const tests = Array.from({ length: 10 }, (_, i) => i + 1);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 justify-items-start">
        {tests.map((testNum) => (
          <div
            key={testNum}
            className="w-[378px] h-[114px] rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm">Đề khảo sát số {testNum}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Mã đề: {bookKey.toUpperCase()} _ TEST {testNum}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100">
                200 Câu hỏi
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-500">Chưa thi</span>
              <button
                onClick={() => handleExamNavigation(bookKey, testNum)}
                style={{ backgroundColor: BRAND }}
                className="text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition duration-150"
              >
                Bắt đầu làm
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
        if (!grammarSubMenu) {
          return (
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-2">Grammar (Ngữ pháp)</h2>
              <p className="text-gray-500 text-sm mb-6">Chọn hình thức học ngữ pháp bạn muốn tiếp cận.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {GRAMMAR_SUBMENU.map((sub) => (
                  <button key={sub.key} onClick={() => setGrammarSubMenu(sub.key)} className="flex flex-col items-start gap-2 p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition duration-200 text-left">
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
                <button onClick={() => setGrammarSubMenu(null)} className="text-xs text-gray-400 hover:text-green-600 transition">← Ngữ pháp</button>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold" style={{ color: BRAND }}>{subInfo?.label}</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">{subInfo?.icon} {subInfo?.label}</h2>
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
                  <button key={sub.key} onClick={() => setVocabSubMenu(sub.key)} className="flex flex-col items-start gap-2 p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition duration-200 text-left">
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
                <button onClick={() => setVocabSubMenu(null)} className="text-xs text-gray-400 hover:text-green-600 transition">← Từ vựng</button>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold" style={{ color: BRAND }}>{subInfo?.label}</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">{subInfo?.icon} {subInfo?.label}</h2>
              <p className="text-gray-500 text-sm mb-4">Chọn chủ đề từ vựng bạn muốn luyện tập.</p>
              {renderVocabTopicCards(vocabSubMenu)}
            </div>
          );
        }
      case 'Bài tập':
        if (!exerciseSkill) {
          return (
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-2">Exercises (Bài tập)</h2>
              <p className="text-gray-500 text-sm mb-6">Chọn kỹ năng TOEIC bạn muốn rèn luyện.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                {EXERCISE_SKILLS.map((skill) => (
                  <button key={skill.key} onClick={() => setExerciseSkill(skill.key)} className="flex flex-col items-start gap-2 p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition duration-200 text-left">
                    <span className="text-2xl">{skill.icon}</span>
                    <span className="font-bold text-gray-800 text-sm">{skill.label}</span>
                    <span className="text-xs text-gray-400">Gồm các phần luyện tập chuyên sâu</span>
                  </button>
                ))}
              </div>
            </div>
          );
        } else {
          const skillInfo = EXERCISE_SKILLS.find(s => s.key === exerciseSkill);
          return (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setExerciseSkill(null)} className="text-xs text-gray-400 hover:text-green-600 transition">← Bài tập</button>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold" style={{ color: BRAND }}>{skillInfo?.label}</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">{skillInfo?.icon} {skillInfo?.label}</h2>
              <p className="text-gray-500 text-sm mb-4">Chọn Part tiêu điểm để bắt đầu quá trình nạp kiến thức.</p>
              {renderExercisePartCards(exerciseSkill)}
            </div>
          );
        }

      case 'Luyện đề':
        // 🌟 THÊM MỚI: Logic render phân hệ Luyện đề
        if (!examBook) {
          return (
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-2">Full-Test (Luyện đề thi thử)</h2>
              <p className="text-gray-500 text-sm mb-6">Chọn giáo trình đề thi thử định dạng chuẩn IIG.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EXAM_BOOKS.map((book) => (
                  <button
                    key={book.key}
                    onClick={() => setExamBook(book.key)}
                    className="flex flex-col items-start gap-2 p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition duration-200 text-left"
                  >
                    <span className="text-2xl">{book.icon}</span>
                    <span className="font-bold text-gray-800 text-sm">{book.label}</span>
                    <span className="text-xs text-gray-400">Trọn bộ 10 bài thi mẫu</span>
                  </button>
                ))}
              </div>
            </div>
          );
        } else {
          const bookInfo = EXAM_BOOKS.find(b => b.key === examBook);
          return (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setExamBook(null)}
                  className="text-xs text-gray-400 hover:text-green-600 transition"
                >← Luyện đề</button>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold" style={{ color: BRAND }}>{bookInfo?.label}</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">
                {bookInfo?.icon} Bộ đề {bookInfo?.label}
              </h2>
              <p className="text-gray-500 text-sm mb-4">Chọn đề thi thử để bắt đầu làm bài tính thời gian (120 phút).</p>
              {renderExamTestCards(examBook)}
            </div>
          );
        }

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

              {/* Submenu Ngữ pháp */}
              {item === 'Ngữ pháp' && activeMenu === 'Ngữ pháp' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {GRAMMAR_SUBMENU.map((sub) => (
                    <button key={sub.key} onClick={() => setGrammarSubMenu(sub.key)} className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5 ${grammarSubMenu === sub.key ? 'bg-white/90 text-green-800 font-bold shadow-sm' : 'text-white/90 hover:bg-white/20'}`}>
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
                    <button key={sub.key} onClick={() => setVocabSubMenu(sub.key)} className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5 ${vocabSubMenu === sub.key ? 'bg-white/90 text-green-800 font-bold shadow-sm' : 'text-white/90 hover:bg-white/20'}`}>
                      <span>{sub.icon}</span>
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Submenu Bài tập */}
              {item === 'Bài tập' && activeMenu === 'Bài tập' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {EXERCISE_SKILLS.map((skill) => (
                    <div key={skill.key} className="flex flex-col">
                      <button onClick={() => { setExerciseSkill(skill.key); setExercisePart(null); }} className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5 ${exerciseSkill === skill.key ? 'bg-white/90 text-green-800 font-bold shadow-sm' : 'text-white/90 hover:bg-white/20'}`}>
                        <span>{skill.icon}</span>
                        <span>{skill.label}</span>
                      </button>
                      {exerciseSkill === skill.key && (
                        <div className="mt-0.5 ml-3 pl-1.5 border-l border-white/40 flex flex-col gap-0.5">
                          {EXERCISE_PARTS[skill.key].map((part) => (
                            <button key={part.key} onClick={() => { setExercisePart(part.key); handleExerciseNavigation(part.key); }} className={`text-left w-full py-1.5 px-2 rounded-md text-[11px] transition duration-150 line-clamp-1 ${exercisePart === part.key ? 'bg-white/70 text-green-900 font-bold' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                              Part {part.key.split('_p')[1]?.toUpperCase() || part.key}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 🌟 THÊM MỚI: Submenu hiển thị danh sách bộ giáo trình Luyện Đề trên Sidebar */}
              {item === 'Luyện đề' && activeMenu === 'Luyện đề' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {EXAM_BOOKS.map((book) => (
                    <button
                      key={book.key}
                      onClick={() => setExamBook(book.key)}
                      className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5
                        ${examBook === book.key
                          ? 'bg-white/90 text-green-800 font-bold shadow-sm'
                          : 'text-white/90 hover:bg-white/20'
                        }`}
                    >
                      <span>{book.icon}</span>
                      <span>{book.label}</span>
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
              {exerciseSkill && activeMenu === 'Bài tập' && (
                <> / <span style={{ color: BRAND }} className="font-medium">{EXERCISE_SKILLS.find(s => s.key === exerciseSkill)?.label}</span></>
              )}
              {/* Breadcrumb động cho hệ thống luyện đề */}
              {examBook && activeMenu === 'Luyện đề' && (
                <> / <span style={{ color: BRAND }} className="font-medium">{EXAM_BOOKS.find(b => b.key === examBook)?.label}</span></>
              )}
            </p>
            <div className="mt-2">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}