import type { Metadata } from "next";
import { DashboardNav } from "@/components/DashboardNav";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Můj přehled", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [profile, enrollments] = await Promise.all([
    db.tutorProfile.findUnique({ where: { userId: user.id }, select: { slug: true, published: true } }),
    db.enrollment.findMany({
      where: { studentId: user.id },
      include: { tutor: { include: { user: { select: { name: true } } } } },
    }),
  ]);

  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[230px_1fr]">
      <DashboardNav
        isTutor={Boolean(profile)}
        isAdmin={user.role === "ADMIN"}
        profileSlug={profile?.published ? profile.slug : null}
        tutors={enrollments.map((e) => ({ id: e.tutorId, name: e.tutor.user.name ?? "Lektor" }))}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
