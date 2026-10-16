import type { Metadata } from "next";
import { AdminNav } from "./AdminNav";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Administrace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="badge bg-ink text-white">ADMIN</span>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
