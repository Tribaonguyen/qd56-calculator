import "./globals.css";

export const metadata = {
  title: "Tính Quy Mô Công Trình (QĐ 56)",
  description: "Ứng dụng tính toán quy mô công trình tự động theo Quyết định 56/2021/QĐ-UBND TP.HCM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
