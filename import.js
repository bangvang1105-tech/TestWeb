const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const xlsx = require("xlsx");

// Đảm bảo file chìa khóa serviceAccountKey.json đang nằm cùng thư mục
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(); 

async function uploadData() {
  try {
    console.log("1. Đang đọc dữ liệu từ file Excel...");
    
    // Tên file Excel của bạn (hãy đảm bảo tên file đúng như tên đang lưu trên máy)
    const workbook = xlsx.readFile("ETS2023_Test1_Final_Architecture.xlsx");
    
    // --- BƯỚC 1: XỬ LÝ SHEET TEST_INFO (CHỨA AUDIO) ---
    const infoSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Test_Info"])[0];
    
    // LẤY MÃ ĐỀ & DỌN DẸP DẤU CÁCH THỪA (Vô cùng quan trọng)
    const testId = infoSheet.test_id.toString().trim(); 
    
    // Đảm bảo collection là 'toeic_tests' và Document ID là testId đã dọn dẹp
    const testRef = db.collection("toeic_tests").doc(testId);
    
    console.log(`2. Đang tạo cơ sở dữ liệu gốc (chứa Audio) cho mã đề: [${testId}]...`);
    // Ghi dữ liệu info (gồm full_audio_url) vào thư mục gốc
    await testRef.set(infoSheet);

    // --- BƯỚC 2: XỬ LÝ SHEET TEST_DATA (CHỨA CÂU HỎI VÀ ĐOẠN VĂN) ---
    const dataSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Test_Data"]);
    
    console.log(`3. Đang đẩy ${dataSheet.length} câu hỏi và đoạn văn lên Firebase...`);
    const batch = db.batch();
    
    dataSheet.forEach((row) => {
      // Dọn dẹp ID câu hỏi cho chắc ăn
      const questionId = row.id.toString().trim();
      const questionRef = testRef.collection("questions").doc(questionId);
      
      // Ghi dữ liệu từng câu hỏi (chứa group_id, passage_content...)
      batch.set(questionRef, row);
    });

    // Thực thi đẩy toàn bộ
    await batch.commit();
    console.log("🎉 XONG! Dữ liệu Audio, Đoạn văn và Câu hỏi đã vào dự án Firebase thành công!");
    console.log("👉 Bây giờ bạn hãy quay lại trang Web và F5 (Tải lại trang) để kiểm tra nhé.");
    
  } catch (error) {
    console.error("❌ Có lỗi xảy ra:", error);
  }
}

uploadData();