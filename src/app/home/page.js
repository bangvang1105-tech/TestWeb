'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Roboto } from 'next/font/google';
import { db } from '@/firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, orderBy, limit } from 'firebase/firestore';

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
  { key: 'typer', label: 'Đua tốc độ phản xạ', icon: '⚡' },
  { key: 'invaders', label: 'Vượt chướng ngại vật', icon: '🚀' }, 
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
  { id: 13, title: 'Các loại so sánh', subtitle: 'Comparisons' }, 
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
    { key: 'quiz_p5', label: 'Trắc nghiệm Part 5', detail: 'Câu chưa hoàn chỉnh' },
    { key: 'quiz_p6', label: 'Trắc nghiệm Part 6', detail: 'Hoàn thành đoạn văn' },
    { key: 'quiz_p7', label: 'Trắc nghiệm Part 7', detail: 'Đọc hiểu đoạn văn' },
    { key: 'grammar_list', label: 'Luyện tập Ngữ pháp', detail: 'Trọn bộ 13 chuyên đề trọng tâm' }
  ]
};

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

  const [examBook, setExamBook] = useState(null); 

  const [userProgress, setUserProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [userStreak, setUserStreak] = useState(1);
  const [leaderboardData, setLeaderboardData] = useState([]);

  const CURRENT_USER_ID = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (!CURRENT_USER_ID) {
      router.push('/');
      return;
    }

    async function initializeDashboardData() {
      try {
        setLoadingProgress(true);
        const querySnapshot = await getDocs(collection(db, 'users', CURRENT_USER_ID, 'progress'));
        const progressMap = {};
        let completedCounter = 0;
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          progressMap[docSnap.id] = data;
          if (data.status === 'completed') completedCounter++;
        });
        setUserProgress(progressMap);

        const todayStr = new Date().toLocaleDateString('sv-SE');
        const userRef = doc(db, 'users', CURRENT_USER_ID);
        const userSnap = await getDoc(userRef);
        
        let currentStreak = 1;
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const lastActive = userData.lastActiveDate;
          currentStreak = userData.streak || 1;

          if (lastActive && lastActive !== todayStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('sv-SE');

            if (lastActive === yesterdayStr) {
              currentStreak += 1;
            } else {
              currentStreak = 1;
            }
          }
        }
        setUserStreak(currentStreak);

        await setDoc(userRef, {
          streak: currentStreak,
          lastActiveDate: todayStr,
          completedCount: completedCounter
        }, { merge: true });

        const usersQuery = query(collection(db, 'users'), orderBy('completedCount', 'desc'), limit(5));
        const usersSnapshot = await getDocs(usersQuery);
        const ranks = [];
        let index = 1;
        usersSnapshot.forEach((uSnap) => {
          const uData = uSnap.data();
          ranks.push({ rank: index++, name: uSnap.id, count: uData.completedCount || 0 });
        });
        setLeaderboardData(ranks);

      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProgress(false);
      }
    }
    initializeDashboardData();
  }, [activeMenu, CURRENT_USER_ID, router]);

  const menuItems = ['Tổng quan', 'Khóa học', 'Ngữ pháp', 'Từ vựng', 'Bài tập', 'Luyện đề'];

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('userId');
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
    if (item !== 'Luyện đề') setExamBook(null);
  };

  const handleNavigation = (type, id, params = '') => {
    router.push(`/lesson?type=${type}&id=${id}${params}`);
  };

  const handleVocabTopicNavigation = (mode, topicId, params = '') => {
    router.push(`/vocabulary?mode=${mode}&topic=${topicId}${params}`);
  };

  const handleGrammarTopicNavigation = (mode, topicId, params = '') => {
    router.push(`/grammar?mode=${mode}&topic=${topicId}${params}`);
  };

  const handleExerciseNavigation = (partKey, params = '') => {
    if (partKey === 'grammar_list') {
      setExercisePart(partKey);
      return;
    }
    // Chuyển hướng đến bài tập Part 1-7
    router.push(`/exercise?part=${partKey}${params}`);
  };

  const handleExamNavigation = (bookKey, testId, params = '') => {
    router.push(`/exam?book=${bookKey}&test=${testId}${params}`);
  };

  const handleHistoryNavigation = (type, mode, topicId) => {
    // Điều hướng sang trang xem lịch sử (History)
    router.push(`/history?type=${type}&mode=${mode}&id=${topicId}`);
  }

  // 🌟 HÀM TẠO DỮ LIỆU HIỂN THỊ BAO GỒM 3 TRẠNG THÁI
  const buildDisplayData = (rawData, prefixType) => {
    return rawData.map(item => {
      const targetLessonId = `${prefixType}_${item.id || item.key}`;
      const progress = userProgress[targetLessonId];
      let status = 'not_started';
      
      if (progress) {
        if (progress.status === 'completed') {
          status = 'completed';
        } else if (progress.status === 'in_progress') {
          status = 'in_progress';
        }
      }
      return { ...item, status };
    });
  };

  // KẾT LIỀN GIAO DIỆN THEO 3 TRƯỜNG HỢP NÚT BẤM VÀ LABEL
  const renderStatusLabel = (status) => {
    if (status === 'not_started') return <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-black bg-gray-100 text-gray-500 uppercase tracking-wide">⚪ Chưa học</span>;
    if (status === 'in_progress') return <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-black bg-blue-50 text-blue-600 uppercase tracking-wide">⏳ Đang học</span>;
    if (status === 'completed') return <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-black bg-green-50 text-green-600 uppercase tracking-wide">✅ Đã học xong</span>;
    return null;
  };

  const renderGrammarExerciseCards = () => {
    if (loadingProgress) return <p className="text-gray-400 text-xs mt-4">Đang tải tiến trình...</p>;
    const dataList = buildDisplayData(GRAMMAR_TOPICS, 'grammar_practice');
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 w-full">
        {dataList.map((item) => (
          <div key={item.id} className="w-full min-h-[160px] rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="mb-3">
              <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{item.title}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{item.subtitle}</p>
            </div>
            
            <div className="mb-4">
              {renderStatusLabel(item.status)}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {item.status === 'not_started' && (
                <button onClick={() => handleNavigation('grammar_practice', item.id)} className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-900 text-white hover:bg-black transition-all">Làm bài</button>
              )}
              {item.status === 'in_progress' && (
                <div className="flex gap-2">
                  <button onClick={() => handleNavigation('grammar_practice', item.id, '&resume=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-blue-500 text-white hover:bg-blue-600 transition-all">Tiếp tục làm</button>
                  <button onClick={() => handleNavigation('grammar_practice', item.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Làm lại</button>
                </div>
              )}
              {item.status === 'completed' && (
                <div className="flex gap-2">
                  <button onClick={() => handleHistoryNavigation('grammar', 'practice', item.id)} className="flex-1 py-2.5 rounded-xl font-bold text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">Lịch sử</button>
                  <button onClick={() => handleNavigation('grammar_practice', item.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-green-500 text-white hover:bg-green-600 transition-all">Ôn lại</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVocabTopicCards = (mode) => {
    if (loadingProgress) return <p className="text-gray-400 text-xs mt-4">Đang tải tiến trình...</p>;
    const dataList = buildDisplayData(VOCAB_TOPICS, `vocab_${mode}`);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 w-full">
        {dataList.map((topic) => (
          <div key={topic.id} className="w-full min-h-[160px] rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="mb-3">
              <h3 className="font-bold text-gray-800 text-sm line-clamp-1">Chủ đề {topic.id}: {topic.title}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{topic.subtitle}</p>
            </div>
            
            <div className="mb-4">
              {renderStatusLabel(topic.status)}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {topic.status === 'not_started' && (
                <button onClick={() => handleVocabTopicNavigation(mode, topic.id)} className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-900 text-white hover:bg-black transition-all">Làm bài</button>
              )}
              {topic.status === 'in_progress' && (
                <div className="flex gap-2">
                  <button onClick={() => handleVocabTopicNavigation(mode, topic.id, '&resume=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-blue-500 text-white hover:bg-blue-600 transition-all">Tiếp tục làm</button>
                  <button onClick={() => handleVocabTopicNavigation(mode, topic.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Làm lại</button>
                </div>
              )}
              {topic.status === 'completed' && (
                <div className="flex gap-2">
                  <button onClick={() => handleHistoryNavigation('vocab', mode, topic.id)} className="flex-1 py-2.5 rounded-xl font-bold text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">Lịch sử</button>
                  <button onClick={() => handleVocabTopicNavigation(mode, topic.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-green-500 text-white hover:bg-green-600 transition-all">Ôn lại</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGrammarTopicCards = (mode) => {
    if (loadingProgress) return <p className="text-gray-400 text-xs mt-4">Đang tải tiến trình...</p>;
    const dataList = buildDisplayData(GRAMMAR_TOPICS, `grammar_${mode}`);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 w-full">
        {dataList.map((topic) => (
          <div key={topic.id} className="w-full min-h-[160px] rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="mb-3">
              <h3 className="font-bold text-gray-800 text-sm line-clamp-1">Bài {topic.id}: {topic.title}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{topic.subtitle}</p>
            </div>
            
            <div className="mb-4">
              {renderStatusLabel(topic.status)}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {topic.status === 'not_started' && (
                <button onClick={() => handleGrammarTopicNavigation(mode, topic.id)} className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-900 text-white hover:bg-black transition-all">Làm bài</button>
              )}
              {topic.status === 'in_progress' && (
                <div className="flex gap-2">
                  <button onClick={() => handleGrammarTopicNavigation(mode, topic.id, '&resume=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-blue-500 text-white hover:bg-blue-600 transition-all">Tiếp tục làm</button>
                  <button onClick={() => handleGrammarTopicNavigation(mode, topic.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Làm lại</button>
                </div>
              )}
              {topic.status === 'completed' && (
                <div className="flex gap-2">
                  <button onClick={() => handleHistoryNavigation('grammar', mode, topic.id)} className="flex-1 py-2.5 rounded-xl font-bold text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">Lịch sử</button>
                  <button onClick={() => handleGrammarTopicNavigation(mode, topic.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-green-500 text-white hover:bg-green-600 transition-all">Ôn lại</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderExercisePartCards = (skillKey) => {
    if (loadingProgress) return <p className="text-gray-400 text-xs mt-4">Đang tải tiến trình...</p>;
    const parts = EXERCISE_PARTS[skillKey] || [];
    const dataList = buildDisplayData(parts, 'exercise');

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 w-full">
        {dataList.map((part) => (
          <div key={part.key} className="w-full min-h-[160px] rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="mb-3">
              <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{part.label}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{part.detail}</p>
            </div>
            
            <div className="mb-4">
              {renderStatusLabel(part.status)}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {part.status === 'not_started' && (
                <button onClick={() => handleExerciseNavigation(part.key)} className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-900 text-white hover:bg-black transition-all">Làm bài</button>
              )}
              {part.status === 'in_progress' && (
                <div className="flex gap-2">
                  <button onClick={() => handleExerciseNavigation(part.key, '&resume=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-blue-500 text-white hover:bg-blue-600 transition-all">Tiếp tục làm</button>
                  <button onClick={() => handleExerciseNavigation(part.key, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Làm lại</button>
                </div>
              )}
              {part.status === 'completed' && (
                <div className="flex gap-2">
                  <button onClick={() => handleHistoryNavigation('exercise', 'part', part.key)} className="flex-1 py-2.5 rounded-xl font-bold text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">Lịch sử</button>
                  <button onClick={() => handleExerciseNavigation(part.key, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-green-500 text-white hover:bg-green-600 transition-all">Ôn lại</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderExamTestCards = (bookKey) => {
    if (loadingProgress) return <p className="text-gray-400 text-xs mt-4">Đang tải tiến trình...</p>;
    const tests = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, key: `${bookKey}_test_${i + 1}` }));
    const dataList = buildDisplayData(tests, 'exam');

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 w-full">
        {dataList.map((test) => (
          <div key={test.key} className="w-full min-h-[160px] rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col justify-between hover:border-green-300 hover:shadow-md transition duration-200">
            <div className="mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Đề khảo sát số {test.id}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Mã đề: {bookKey.toUpperCase()} _ TEST {test.id}</p>
            </div>
            
            <div className="mb-4">
              {renderStatusLabel(test.status)}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {test.status === 'not_started' && (
                <button onClick={() => handleExamNavigation(bookKey, test.id)} className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-900 text-white hover:bg-black transition-all">Bắt đầu thi</button>
              )}
              {test.status === 'in_progress' && (
                <div className="flex gap-2">
                  <button onClick={() => handleExamNavigation(bookKey, test.id, '&resume=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-blue-500 text-white hover:bg-blue-600 transition-all">Tiếp tục thi</button>
                  <button onClick={() => handleExamNavigation(bookKey, test.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Thi lại</button>
                </div>
              )}
              {test.status === 'completed' && (
                <div className="flex gap-2">
                  <button onClick={() => handleHistoryNavigation('exam', bookKey, test.id)} className="flex-1 py-2.5 rounded-xl font-bold text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">Bảng điểm</button>
                  <button onClick={() => handleExamNavigation(bookKey, test.id, '&restart=true')} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-green-500 text-white hover:bg-green-600 transition-all">Thi lại</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'Tổng quan':
        const completedLessons = Object.values(userProgress).filter(p => p.status === 'completed');
        const totalCompleted = completedLessons.length;
        
        let averageScorePct = 0;
        if (totalCompleted > 0) {
          const totalPct = completedLessons.reduce((acc, curr) => {
            const totalQ = curr.totalQuestions || 10;
            return acc + ((curr.score / totalQ) * 100);
          }, 0);
          averageScorePct = Math.round(totalPct / totalCompleted);
        }

        const inProgressLessons = Object.entries(userProgress).filter(([_, p]) => p.status === 'in_progress');
        const recentIncomplete = inProgressLessons[0];

        return (
          <div className="flex flex-col gap-7">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-6 md:p-8 text-white flex flex-wrap justify-between items-center gap-5 shadow-lg shadow-green-400/10 relative overflow-hidden">
              <div className="absolute w-44 h-44 rounded-full bg-white/5 -top-10 -right-5"></div>
              <div className="z-10">
                <h2 className="text-xl md:text-2xl font-black tracking-wide">XIN CHÀO, {CURRENT_USER_ID ? String(CURRENT_USER_ID).toUpperCase() : 'HỌC VIÊN'}! 👋</h2>
                <p className="text-sm mt-1.5 color-white/90 font-medium max-w-xl leading-relaxed">"Đường chạy chinh phục chứng chỉ TOEIC cùng Thầy Băng đã kích hoạt. Hôm nay hãy tiếp tục bứt phá giới hạn nhé!"</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-extrabold border border-white/25 shadow-sm z-10">🔥 Chuỗi học: {userStreak} ngày liên tục</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="border border-gray-100 bg-white rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider"><span>🎯</span> Bài tập đã xong</div>
                <div className="flex items-baseline gap-1.5"><span className="text-3xl font-black text-gray-800">{totalCompleted}</span><span className="text-xs text-gray-400 font-semibold">chủ đề</span></div>
              </div>
              <div className="border border-gray-100 bg-white rounded-2xl p-5 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider"><span>📈</span> Độ chính xác</div>
                <div className="flex items-baseline gap-1.5"><span className="text-3xl font-black text-green-500">{averageScorePct}%</span><span className="text-xs text-gray-400 font-semibold">trung bình</span></div>
              </div>
              <div className="border border-gray-100 bg-white rounded-2xl p-5 flex flex-col justify-center shadow-sm">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Học lực hiện tại</div>
                <div><span className="text-xs font-extrabold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Tài khoản Active</span></div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">📌 Lịch trình ôn luyện</h3>
                {recentIncomplete ? (
                  <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/20 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">HỌC DỞ GẦN NHẤT</span>
                      <h4 className="font-extrabold text-gray-800 text-sm mt-2">{recentIncomplete[0].replace('_', ' ').toUpperCase()}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Bấm nút để tiếp tục lưu và nạp điểm bài tập này.</p>
                    </div>
                    {/* Tạm thời fallback router chung chung */}
                    <button onClick={() => { const [type, id] = recentIncomplete[0].split('_'); router.push(`/lesson?type=${type}&id=${id}`); }} className="bg-amber-500 shadow-sm shadow-amber-500/10 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:opacity-95 transition">Làm tiếp bài →</button>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center text-gray-400 text-xs font-semibold bg-white">🎉 Thật tuyệt vời! Bạn không bỏ dở bài tập nào. Hãy chọn mục mới để học.</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleMenuClick('Từ vựng')} className="p-4 text-left border border-gray-100 bg-white hover:border-green-300 rounded-2xl shadow-sm transition group"><span className="text-xl">📖</span><div className="font-bold text-gray-700 text-xs mt-2 group-hover:text-green-500 transition">Học Từ Vựng nhanh</div></button>
                  <button onClick={() => handleMenuClick('Luyện đề')} className="p-4 text-left border border-gray-100 bg-white hover:border-green-300 rounded-2xl shadow-sm transition group"><span className="text-xl">⏱️</span><div className="font-bold text-gray-700 text-xs mt-2 group-hover:text-green-500 transition">Luyện đề Full-Test</div></button>
                </div>
              </div>

              <div className="w-full lg:w-80 border border-gray-100 bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-4">🏆 Bảng Vàng Học Viên</h3>
                <div className="flex flex-col gap-3">
                  {leaderboardData.map((student) => (
                    <div key={student.rank} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[11px] ${student.rank === 1 ? 'bg-amber-100 text-amber-800' : student.rank === 2 ? 'bg-slate-100 text-slate-700' : 'bg-orange-50 text-orange-800'}`}>{student.rank}</span>
                        <span className={`font-semibold ${student.name === CURRENT_USER_ID ? 'text-green-500 font-bold' : 'text-gray-600'}`}>{student.name} {student.name === CURRENT_USER_ID && "(Bạn)"}</span>
                      </div>
                      <span className="font-extrabold text-gray-700 flex items-center gap-1">{student.count} bài done {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                    <span className="text-xs text-gray-400">13 chủ đề trọng tâm</span>
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
                <span className="text-xs font-semibold text-green-400">{subInfo?.label}</span>
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
                <span className="text-xs font-semibold text-green-400">{subInfo?.label}</span>
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
                <button onClick={() => { setExerciseSkill(null); setExercisePart(null); }} className="text-xs text-gray-400 hover:text-green-600 transition">← Bài tập</button>
                <span className="text-xs text-gray-300">/</span>
                <span className="text-xs font-semibold text-green-400">{skillInfo?.label}</span>
                {exercisePart === 'grammar_list' && (
                  <>
                    <span className="text-xs text-gray-300"> / </span>
                    <span className="text-xs font-semibold text-green-500">Luyện tập Ngữ pháp</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">{skillInfo?.icon} {skillInfo?.label}</h2>
              <p className="text-gray-500 text-sm mb-4">Chọn tiêu điểm chuyên sâu để bắt đầu làm bài.</p>
              
              {exercisePart === 'grammar_list' ? renderGrammarExerciseCards() : renderExercisePartCards(exerciseSkill)}
            </div>
          );
        }
      case 'Luyện đề':
        if (!examBook) {
          return (
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-2">Full-Test (Luyện đề thi thử)</h2>
              <p className="text-gray-500 text-sm mb-6">Chọn giáo trình đề thi thử định dạng chuẩn IIG.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EXAM_BOOKS.map((book) => (
                  <button key={book.key} onClick={() => setExamBook(book.key)} className="flex flex-col items-start gap-2 p-5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-green-300 hover:shadow-md transition duration-200 text-left"><span className="text-2xl">{book.icon}</span><span className="font-bold text-gray-800 text-sm">{book.label}</span><span className="text-xs text-gray-400">Trọn bộ 10 bài thi mẫu</span></button>
                ))}
              </div>
            </div>
          );
        } else {
          const bookInfo = EXAM_BOOKS.find(b => b.key === examBook);
          return (
            <div>
              <div className="flex items-center gap-2 mb-1"><button onClick={() => setExamBook(null)} className="text-xs text-gray-400 hover:text-green-600 transition">← Luyện đề</button><span className="text-xs text-gray-300">/</span><span className="text-xs font-semibold text-green-400">{bookInfo?.label}</span></div>
              <h2 className="text-xl font-extrabold text-gray-800 mb-1">{bookInfo?.icon} Bộ đề {bookInfo?.label}</h2>
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
      <header className="shadow-md px-6 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50 bg-green-400">
        <span className="text-white font-bold text-xl tracking-wide">TOEIC Thầy Băng</span>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">Xin chào, {CURRENT_USER_ID}!</span>
          <button onClick={handleLogout} className="bg-white font-semibold text-sm px-4 py-1.5 rounded-lg text-green-400 hover:bg-green-50 transition duration-200 shadow-sm">Đăng xuất</button>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* SIDEBAR */}
        <aside className="w-48 shadow-lg flex flex-col py-6 px-3 gap-1 fixed left-0 top-14 bottom-0 overflow-y-auto bg-green-400 hidden md:flex">
          {menuItems.map((item) => (
            <div key={item}>
              <button onClick={() => handleMenuClick(item)} className={`text-left w-full px-4 py-3 rounded-lg text-sm font-semibold transition duration-150 ${activeMenu === item ? 'bg-white text-green-400 shadow-sm' : 'text-white hover:bg-white/20'}`}>{item}</button>
              
              {item === 'Ngữ pháp' && activeMenu === 'Ngữ pháp' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {GRAMMAR_SUBMENU.map((sub) => (
                    <button key={sub.key} onClick={() => setGrammarSubMenu(sub.key)} className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5 ${grammarSubMenu === sub.key ? 'bg-white/90 text-green-800 font-bold shadow-sm' : 'text-white/90 hover:bg-white/20'}`}><span>{sub.icon}</span><span>{sub.label}</span></button>
                  ))}
                </div>
              )}

              {item === 'Từ vựng' && activeMenu === 'Từ vựng' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {VOCAB_SUBMENU.map((sub) => (
                    <button key={sub.key} onClick={() => setVocabSubMenu(sub.key)} className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5 ${vocabSubMenu === sub.key ? 'bg-white/90 text-green-800 font-bold shadow-sm' : 'text-white/90 hover:bg-white/20'}`}><span>{sub.icon}</span><span>{sub.label}</span></button>
                  ))}
                </div>
              )}

              {item === 'Bài tập' && activeMenu === 'Bài tập' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {EXERCISE_SKILLS.map((skill) => (
                    <div key={skill.key} className="flex flex-col">
                      <button onClick={() => { setExerciseSkill(skill.key); setExercisePart(null); }} className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5 ${exerciseSkill === skill.key ? 'bg-white/90 text-green-800 font-bold shadow-sm' : 'text-white/90 hover:bg-white/20'}`}><span>{skill.icon}</span><span>{skill.label}</span></button>
                      {exerciseSkill === skill.key && (
                        <div className="mt-0.5 ml-3 pl-1.5 border-l border-white/40 flex flex-col gap-0.5">
                          {EXERCISE_PARTS[skill.key].map((part) => (
                            <button key={part.key} onClick={() => { setExercisePart(part.key); handleExerciseNavigation(part.key); }} className={`text-left w-full py-1.5 px-2 rounded-md text-[11px] transition duration-150 line-clamp-1 ${exercisePart === part.key ? 'bg-white/70 text-green-900 font-bold' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>Part {part.key === 'grammar_list' ? 'Grammar' : part.key.split('_p')[1]?.toUpperCase()}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {item === 'Luyện đề' && activeMenu === 'Luyện đề' && (
                <div className="mt-1 ml-2 flex flex-col gap-0.5">
                  {EXAM_BOOKS.map((book) => (
                    <button key={book.key} onClick={() => setExamBook(book.key)} className={`text-left w-full px-3 py-2 rounded-lg text-xs font-medium transition duration-150 flex items-center gap-1.5 ${examBook === book.key ? 'bg-white/90 text-green-800 font-bold shadow-sm' : 'text-white/90 hover:bg-white/20'}`}><span>{book.icon}</span><span>{book.label}</span></button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-4 md:p-8 ml-0 md:ml-48 w-full overflow-x-hidden">
          <div className="max-w-5xl mx-auto rounded-xl bg-white p-4 md:p-6 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-4">
              Trang chủ / <span className="font-medium text-green-400">{activeMenu}</span>
              {grammarSubMenu && activeMenu === 'Ngữ pháp' && <> / <span className="font-medium text-green-400">{GRAMMAR_SUBMENU.find(s => s.key === grammarSubMenu)?.label}</span></>}
              {vocabSubMenu && activeMenu === 'Từ vựng' && <> / <span className="font-medium text-green-400">{VOCAB_SUBMENU.find(s => s.key === vocabSubMenu)?.label}</span></>}
              {exerciseSkill && activeMenu === 'Bài tập' && <> / <span className="font-medium text-green-400">{EXERCISE_SKILLS.find(s => s.key === exerciseSkill)?.label}</span></>}
              {examBook && activeMenu === 'Luyện đề' && <> / <span className="font-medium text-green-400">{EXAM_BOOKS.find(b => b.key === examBook)?.label}</span></>}
            </p>
            <div className="mt-2">{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}