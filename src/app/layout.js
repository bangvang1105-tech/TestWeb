import { Roboto } from "next/font/google";
import "./globals.css";

// Cấu hình font Roboto hỗ trợ đầy đủ Tiếng Việt và các trọng số độ đậm
const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

export const metadata = {
  title: "TOEIC Thầy Băng",
  description: "Hệ thống luyện thi TOEIC trực tuyến",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="h-full">
      {/* Ép bộ class của font Roboto lên toàn cục thẻ body */}
      <body className={`${roboto.className} min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}