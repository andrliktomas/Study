import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Export všech osobních údajů uživatele (GDPR – právo na přenositelnost). */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return new Response("Nepřihlášen", { status: 401 });

  const user = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    select: {
      id: true, name: true, email: true, emailVerified: true, image: true, role: true, timezone: true, termsAcceptedAt: true, createdAt: true,
      accounts: { select: { provider: true, scope: true } },
      tutorProfile: {
        include: {
          packages: true,
          availability: true,
          enrollments: { include: { student: { select: { name: true, email: true } } } },
          purchases: true,
          lessons: true,
          reviews: true,
        },
      },
      enrollments: { include: { tutor: { select: { slug: true, user: { select: { name: true } } } } } },
      purchases: true,
      lessons: true,
      reviews: true,
      messages: { select: { id: true, enrollmentId: true, body: true, createdAt: true, file: { select: { filename: true, size: true } } } },
    },
  });
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), user }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="moje-data.json"' },
  });
}
