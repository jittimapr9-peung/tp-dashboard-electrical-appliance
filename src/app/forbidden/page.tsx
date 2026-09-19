import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">403 — ไม่มีสิทธิ์เข้าถึง</h1>
      <p className="text-slate-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ตามบทบาทของคุณ</p>
      <Link href="/" className="text-sm text-slate-700 underline">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
