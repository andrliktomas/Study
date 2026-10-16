import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("heslo1234", 12);

  const tutor = await db.user.upsert({
    where: { email: "lektor@example.com" },
    update: {},
    create: {
      email: "lektor@example.com",
      name: "Jana Nováková",
      passwordHash,
      role: "TUTOR",
      tutorProfile: {
        create: {
          slug: "jana-novakova",
          headline: "Angličtina pro dospělé a business English",
          bio: "Učím angličtinu přes 8 let, z toho 5 let online. Specializuji se na konverzaci a přípravu na pracovní pohovory.\n\nLekce stavím na vašich cílech – žádné nudné drilování, ale praktická angličtina, kterou hned použijete.",
          languages: "en",
          levels: "A2,B1,B2,C1",
          city: "Brno",
          published: true,
          packages: {
            create: [
              { name: "Zkušební lekce", lessonCount: 1, durationMin: 30, priceCents: 25000, isTrial: true, sortOrder: 0 },
              { name: "Jedna lekce", lessonCount: 1, durationMin: 60, priceCents: 55000, sortOrder: 1 },
              { name: "Balíček 5 lekcí", lessonCount: 5, durationMin: 60, priceCents: 250000, sortOrder: 2, description: "Ušetříte 250 Kč" },
              { name: "Balíček 10 lekcí", lessonCount: 10, durationMin: 60, priceCents: 450000, sortOrder: 3, description: "Nejvýhodnější" },
            ],
          },
          availability: {
            create: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 15 * 60, endMinute: 20 * 60 })),
          },
        },
      },
    },
    include: { tutorProfile: true },
  });

  await db.user.upsert({
    where: { email: "lektor2@example.com" },
    update: {},
    create: {
      email: "lektor2@example.com",
      name: "Martin Svoboda",
      passwordHash,
      role: "TUTOR",
      tutorProfile: {
        create: {
          slug: "martin-svoboda",
          headline: "Němčina a španělština od začátečníků po maturitu",
          bio: "Rodilý mluvčí češtiny, 3 roky jsem žil v Mnichově a 2 roky ve Valencii. Učím hravě, s důrazem na mluvení od první lekce.",
          languages: "de,es",
          levels: "A1,A2,B1",
          published: true,
          packages: {
            create: [
              { name: "Jedna lekce", lessonCount: 1, durationMin: 45, priceCents: 45000 },
              { name: "Balíček 10 lekcí", lessonCount: 10, durationMin: 45, priceCents: 400000 },
            ],
          },
          availability: { create: [{ weekday: 2, startMinute: 9 * 60, endMinute: 13 * 60 }, { weekday: 4, startMinute: 9 * 60, endMinute: 13 * 60 }] },
        },
      },
    },
  });

  await db.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin Platformy", passwordHash, role: "ADMIN", termsAcceptedAt: new Date() },
  });

  const student = await db.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: { email: "student@example.com", name: "Petr Dvořák", passwordHash, role: "STUDENT" },
  });

  const tutorId = tutor.tutorProfile!.id;
  await db.enrollment.upsert({
    where: { tutorId_studentId: { tutorId, studentId: student.id } },
    update: {},
    create: { tutorId, studentId: student.id, notes: "Cíl: pohovor v angličtině do konce roku. Slabší gramatika časů." },
  });

  const existing = await db.purchase.count({ where: { tutorId, studentId: student.id } });
  if (existing === 0) {
    const purchase = await db.purchase.create({
      data: {
        tutorId,
        studentId: student.id,
        packageName: "Balíček 5 lekcí",
        lessonsTotal: 5,
        durationMin: 60,
        amountCents: 250000,
        platformFeeCents: 25000,
        currency: "czk",
        status: "PAID",
        source: "DEV",
        paidAt: new Date(Date.now() - 14 * 864e5),
      },
    });
    const day = 864e5;
    await db.lesson.createMany({
      data: [
        { start: -10, status: "COMPLETED", topic: "Úvodní lekce, rozřazení", notes: "Úroveň cca B1. Dobrá slovní zásoba, chyby v minulých časech.", homework: "Napsat 10 vět o minulém víkendu." },
        { start: -3, status: "COMPLETED", topic: "Past simple vs. present perfect", notes: "Prošli jsme rozdíly, cvičení z učebnice str. 24.", homework: "Workbook str. 12–13" },
      ].map((l) => ({
        tutorId,
        studentId: student.id,
        purchaseId: purchase.id,
        startsAt: new Date(Date.now() + l.start * day),
        endsAt: new Date(Date.now() + l.start * day + 3600e3),
        status: l.status,
        topic: l.topic,
        notes: l.notes,
        homework: l.homework,
      })),
    });
  }

  await db.review.upsert({
    where: { tutorId_studentId: { tutorId, studentId: student.id } },
    update: {},
    create: { tutorId, studentId: student.id, rating: 5, comment: "Jana je skvělá – lekce jsou praktické a konečně se nebojím mluvit." },
  });

  console.log("Seed hotový. Účty (heslo: heslo1234): lektor@example.com, lektor2@example.com, student@example.com, admin@example.com");
}

main().finally(() => db.$disconnect());
