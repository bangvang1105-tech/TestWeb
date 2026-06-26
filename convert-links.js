const XLSX = require('xlsx');

// Hàm chuyển đổi link Google Drive thành Direct Link
function convertDriveLink(url) {
    if (typeof url !== 'string' || !url) return url;
    
    // Tìm File ID từ link
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/);
    
    if (match) {
        const fileId = match[1];
        // Nếu là audio
        if (url.toLowerCase().includes('audio') || url.toLowerCase().includes('.mp3')) {
            return `https://docs.google.com/uc?export=download&id=${fileId}`;
        } 
        // Nếu là hình ảnh
        else {
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
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

    // 2. Quét qua từng dòng và chuyển đổi link
    data.forEach(row => {
        if (row.full_audio_url && typeof row.full_audio_url === 'string' && row.full_audio_url.includes('drive.google.com')) {
            row.full_audio_url = convertDriveLink(row.full_audio_url);
            audioCount++;
        }
        if (row.image_url && typeof row.image_url === 'string' && row.image_url.includes('drive.google.com')) {
            row.image_url = convertDriveLink(row.image_url);
            imageCount++;
        }
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