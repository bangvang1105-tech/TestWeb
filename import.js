const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const xlsx = require("xlsx");
const fs = require("fs");
const readline = require("readline");

// Đảm bảo file chìa khóa serviceAccountKey.json đang nằm cùng thư mục
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Khởi tạo công cụ đọc nhập từ bàn phím
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function uploadData(fileName) {
  try {
    console.log(`\n▶ Đang đọc dữ liệu từ file: [${fileName}]...`);
    
    // Đọc file Excel được chọn
    const workbook = xlsx.readFile(fileName);
    
    // --- BƯỚC 1: XỬ LÝ SHEET TEST_INFO ---
    const infoSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Test_Info"])[0];
    const testId = infoSheet.test_id.toString().trim(); 
    const testRef = db.collection("toeic_tests").doc(testId);
    
    console.log(`▶ Đang tạo cơ sở dữ liệu gốc cho mã đề: [${testId}]...`);
    await testRef.set(infoSheet);

    // --- BƯỚC 2: XỬ LÝ SHEET TEST_DATA ---
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets["Test_Data"], { defval: "" });
    
    // Thuật toán gọt rửa rác Excel
    const dataSheet = rawData.map(row => {
      const cleanRow = {};
      for (let key in row) {
        const cleanKey = key.trim(); 
        let value = row[key];
        if (typeof value === 'string') {
            value = value.trim(); 
        }
        cleanRow[cleanKey] = value;
      }
      return cleanRow;
    });

    console.log(`▶ Đang đẩy ${dataSheet.length} câu hỏi lên Firebase...`);
    const batch = db.batch();
    
    dataSheet.forEach((row) => {
      if (!row.id) return; 
      const questionId = row.id.toString().trim();
      const questionRef = testRef.collection("questions").doc(questionId);
      batch.set(questionRef, row);
    });

    await batch.commit();
    console.log("\n🎉 XONG! Dữ liệu đã vào dự án Firebase thành công!");
    console.log(`👉 Bật web lên và F5 để kiểm tra mã đề [${testId}] ngay thôi!\n`);
    
    // Kết thúc chương trình
    process.exit(0);
    
  } catch (error) {
    console.error("\n❌ Có lỗi xảy ra trong quá trình đẩy dữ liệu:", error);
    process.exit(1);
  }
}

// --- LOGIC TỰ ĐỘNG QUÉT VÀ CHỌN FILE ---
function start() {
  // Quét tất cả các file có đuôi .xlsx trong thư mục, loại bỏ các file tạm đang mở (~$)
  const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.xlsx') && !file.startsWith('~$'));

  if (files.length === 0) {
    console.log("❌ Không tìm thấy file Excel (.xlsx) nào trong thư mục này!");
    process.exit(1);
  }

  console.log("\n📁 TÌM THẤY CÁC FILE EXCEL SAU ĐÂY:");
  files.forEach((file, index) => {
    console.log(`  [${index + 1}]  ${file}`);
  });

  // Yêu cầu người dùng nhập số
  rl.question("\n👉 Vui lòng nhập SỐ THỨ TỰ của file bạn muốn đẩy lên (VD: 1, 2) và ấn Enter: ", (answer) => {
    const choice = parseInt(answer.trim());
    
    // Kiểm tra xem người dùng nhập có đúng số không
    if (isNaN(choice) || choice < 1 || choice > files.length) {
      console.log("❌ Lựa chọn không hợp lệ. Vui lòng chạy lại lệnh!");
      process.exit(1);
    }

    const selectedFile = files[choice - 1];
    uploadData(selectedFile);
  });
}

// Bắt đầu chạy
start();