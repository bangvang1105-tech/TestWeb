const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const xlsx = require("xlsx");

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

// Ở đây, nếu dự án của bạn dùng Database ID là (default), bạn chỉ cần gõ getFirestore()
const db = getFirestore(); 

async function uploadData() {
  try {
    console.log("1. Đang đọc dữ liệu...");
    const workbook = xlsx.readFile("ETS2023_Test1_Final_Architecture.xlsx");
    
    const infoSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Test_Info"])[0];
    
    // Đảm bảo collection là 'toeic_tests'
    const testRef = db.collection("toeic_tests").doc(infoSheet.test_id);
    
    console.log(`2. Đang tạo cơ sở dữ liệu cho: ${infoSheet.test_name}...`);
    await testRef.set(infoSheet);

    const dataSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Test_Data"]);
    
    console.log("3. Đang đẩy dữ liệu...");
    const batch = db.batch();
    dataSheet.forEach((row) => {
      const questionRef = testRef.collection("questions").doc(row.id.toString());
      batch.set(questionRef, row);
    });

    await batch.commit();
    console.log("🎉 XONG! Dữ liệu đã vào dự án testweb!");
  } catch (error) {
    console.error("Lỗi rồi:", error);
  }
}

uploadData();