import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DAY = 864e5;

async function main() {
  const passwordHash = await bcrypt.hash("heslo1234", 12);
  const verified = { emailVerified: new Date(), termsAcceptedAt: new Date() };

  const tutor = await db.user.upsert({
    where: { email: "lektor@example.com" },
    update: {},
    create: {
      email: "lektor@example.com",
      name: "Jana Nováková",
      passwordHash,
      ...verified,
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
          // ukázkový účet z dokumentace ČNB – v praxi lektor zadá svůj
          bankIban: "CZ6508000000192000145399",
          plan: "START",
          subscriptionStatus: "active",
          currentPeriodEnd: new Date(Date.now() + 20 * DAY),
          legalName: "Jana Nováková",
          street: "Masarykova 12",
          cityName: "Brno",
          zip: "602 00",
          companyId: "12345678",
          packages: {
            create: [
              { name: "Zkušební lekce", lessonCount: 1, durationMin: 30, priceCents: 25000, isTrial: true, sortOrder: 0 },
              { name: "Jedna lekce", lessonCount: 1, durationMin: 60, priceCents: 55000, sortOrder: 1 },
              { name: "Balíček 5 lekcí", lessonCount: 5, durationMin: 60, priceCents: 250000, sortOrder: 2, validityDays: 90, description: "Ušetříte 250 Kč" },
              { name: "Balíček 10 lekcí", lessonCount: 10, durationMin: 60, priceCents: 450000, sortOrder: 3, validityDays: 180, description: "Nejvýhodnější" },
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
      ...verified,
      role: "TUTOR",
      tutorProfile: {
        create: {
          slug: "martin-svoboda",
          headline: "Němčina a španělština od začátečníků po maturitu",
          bio: "Rodilý mluvčí češtiny, 3 roky jsem žil v Mnichově a 2 roky ve Valencii. Učím hravě, s důrazem na mluvení od první lekce.",
          languages: "de,es",
          levels: "A1,A2,B1",
          published: true,
          bankIban: "CZ6508000000192000145399",
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

  const student = await db.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: { email: "student@example.com", name: "Petr Dvořák", passwordHash, ...verified, role: "STUDENT" },
  });

  await db.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin Platformy", passwordHash, ...verified, role: "ADMIN" },
  });

  const tutorId = tutor.tutorProfile!.id;
  const enrollment = await db.enrollment.upsert({
    where: { tutorId_studentId: { tutorId, studentId: student.id } },
    update: {},
    create: { tutorId, studentId: student.id, notes: "Cíl: pohovor v angličtině do konce roku. Slabší gramatika časů." },
  });

  if ((await db.purchase.count({ where: { tutorId, studentId: student.id } })) === 0) {
    const pkg = await db.lessonPackage.findFirstOrThrow({ where: { tutorId, name: "Balíček 5 lekcí" } });
    const paidAt = new Date(Date.now() - 14 * DAY);
    const purchase = await db.purchase.create({
      data: {
        tutorId,
        studentId: student.id,
        packageId: pkg.id,
        packageName: pkg.name,
        lessonsTotal: 5,
        durationMin: 60,
        amountCents: 250000,
        currency: "czk",
        status: "PAID",
        source: "TRANSFER",
        variableSymbol: "2026000001",
        paidAt,
        expiresAt: new Date(paidAt.getTime() + 90 * DAY),
      },
    });
    await db.lesson.createMany({
      data: [
        { start: -10, topic: "Úvodní lekce, rozřazení", notes: "Úroveň cca B1. Dobrá slovní zásoba, chyby v minulých časech.", homework: "Napsat 10 vět o minulém víkendu." },
        { start: -3, topic: "Past simple vs. present perfect", notes: "Prošli jsme rozdíly, cvičení z učebnice str. 24.", homework: "Workbook str. 12–13" },
      ].map((l) => ({
        tutorId,
        studentId: student.id,
        purchaseId: purchase.id,
        startsAt: new Date(Date.now() + l.start * DAY),
        endsAt: new Date(Date.now() + l.start * DAY + 3600e3),
        status: "COMPLETED",
        topic: l.topic,
        notes: l.notes,
        homework: l.homework,
      })),
    });
    await db.message.createMany({
      data: [
        { enrollmentId: enrollment.id, senderId: tutor.id, body: "Ahoj Petře, posílám slíbená cvičení na minulé časy. Uvidíme se ve středu!", createdAt: new Date(Date.now() - 3 * DAY), readAt: new Date(Date.now() - 2 * DAY) },
        { enrollmentId: enrollment.id, senderId: student.id, body: "Díky, mrknu na to. Můžeme příště probrat i small talk na pohovoru?", createdAt: new Date(Date.now() - 2 * DAY) },
      ],
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
