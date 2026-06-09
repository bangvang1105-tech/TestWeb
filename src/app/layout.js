import { Roboto } from "next/font/google";
import "./globals.css";

// Cấu hình font Roboto hỗ trợ tiếng Việt toàn cục
const roboto = Roboto({
  weight: ['400', '500', '700', '900'],
  subsets: ['vietnamese'],
  display: 'swap',
});

export const metadata = {
  title: "TOEIC Thầy Băng",
  description: "Hệ thống luyện thi TOEIC trực tuyến",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      className={`${roboto.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}