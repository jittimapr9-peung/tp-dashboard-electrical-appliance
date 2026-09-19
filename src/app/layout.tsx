import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TP Logistics Sales Commission System",
  description:
    "ระบบคำนวณ ตรวจสอบ และสรุปค่าคอมมิชชั่นฝ่ายขาย บริษัท ไทยพาร์เซิลโลจิสติกส์ จำกัด",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">
        {children}
      </body>
    </html>
  );
}
