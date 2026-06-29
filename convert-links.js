const XLSX = require('xlsx');

// Hàm chuyển đổi link Google Drive thành Direct Link
function convertDriveLink(url) {
    if (typeof url !== 'string' || !url) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);

    if (match) {
        const fileId = match[1];
        // Thay thế toàn bộ bằng link Script Google Apps của anh
        return `https://script.google.com/macros/s/AKfycbwRgn0-Trj8VLE4C_IxPdkWbW0po5UJ2GEmukHjov6r-ysKnSscyySgkM3PM0F-mqbU/exec?id=${fileId}`;
    }
    return url;
}

// 1. Tên file Excel gốc cần xử lý (Anh thay tên file của anh vào đây nhé)
const inputFileName = 'ETS2023_Test2_Final_Architecture.xlsx'; 
const sheetName = 'Test_Info'; // Tên sheet trong file

try {
    console.log(`Đang đọc file ${inputFileName}...`);
    const workbook = XLSX.readFile(inputFileName);
    const worksheet = workbook.Sheets[sheetName];
    
// Chuyển dữ liệu sheet thành mảng JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    let audioCount = 0;
    let imageCount = 0;

    // 2. Quét qua từng dòng
    data.forEach(row => {
        // Tự động tìm các cột có chứa "audio" hoặc "image" trong tên cột
        Object.keys(row).forEach(key => {
            const val = row[key];
            if (typeof val === 'string' && val.includes('drive.google.com')) {
                const lowerKey = key.toLowerCase();
                
                if (lowerKey.includes('audio')) {
                    row[key] = convertDriveLink(val);
                    audioCount++;
                } else if (lowerKey.includes('image') || lowerKey.includes('img')) {
                    row[key] = convertDriveLink(val);
                    imageCount++;
                }
            }
        });
    });

    // 3. Ghi lại dữ liệu mới ra một file Excel khác
    const outputFileName = 'ETS2023_Test2_Final_Architecture_1.xlsx';
    const newWorksheet = XLSX.utils.json_to_sheet(data);
    workbook.Sheets[sheetName] = newWorksheet;
    
    XLSX.writeFile(workbook, outputFileName);
    console.log(`✅ Thành công! Đã chuyển đổi ${audioCount} link audio và ${imageCount} link ảnh.`);
    console.log(`🎉 File mới đã được lưu thành: ${outputFileName}`);

} catch (error) {
    console.error("❌ Có lỗi xảy ra. Hãy kiểm tra lại tên file hoặc đường dẫn:", error.message);
}