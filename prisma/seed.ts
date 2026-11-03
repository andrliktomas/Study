import { createPrismaClient } from "../src/lib/prisma-client";
import bcrypt from "bcryptjs";

const db = createPrismaClient(process.env.DATABASE_URL);
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
          // ukázkové účty (vzorové IBANy z dokumentace bank) – v praxi lektor zadá své
          bankAccounts: {
            create: [
              { currency: "czk", holderName: "Jana Nováková", iban: "CZ6508000000192000145399", bic: "GIBACZPX", bankName: "Česká spořitelna" },
              { currency: "eur", holderName: "Jana Nováková", iban: "DE89370400440532013000", bic: "COBADEFFXXX", bankName: "Commerzbank" },
            ],
          },
          plan: "START",
          paidUntil: new Date(Date.now() + 20 * DAY),
          planActiveUntil: new Date(Date.now() + 20 * DAY),
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
              { name: "5 lessons (international)", lessonCount: 5, durationMin: 60, priceCents: 11000, currency: "eur", sortOrder: 4, validityDays: 90, description: "Pro studenty ze zahraničí – platba v eurech (SEPA)" },
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
          bankAccounts: { create: [{ currency: "czk", holderName: "Martin Svoboda", iban: "CZ6508000000192000145399" }] },
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

  // zaplacená faktura za předplatné Jany (číselná řada začíná 1)
  if ((await db.invoice.count({ where: { tutorId } })) === 0) {
    const year = new Date().getFullYear();
    await db.invoiceCounter.upsert({ where: { year }, create: { year, last: 1 }, update: {} });
    const start = new Date(Date.now() - 10 * DAY);
    await db.invoice.create({
      data: {
        number: `${year}0001`,
        tutorId,
        kind: "FIRST",
        plan: "START",
        currency: "czk",
        amountCents: 24900,
        periodStart: start,
        periodEnd: new Date(Date.now() + 20 * DAY),
        issuedAt: start,
        dueAt: new Date(start.getTime() + 14 * DAY),
        status: "PAID",
        paidAt: new Date(start.getTime() + 2 * DAY),
        supplier: JSON.stringify({ name: "Lektorium (ukázka)", lines: ["Ukázková 1, Praha"], companyId: "00000000", account: { holderName: "Lektorium", iban: "CZ6508000000192000145399", bic: "GIBACZPX", bankName: null } }),
        customer: JSON.stringify({ name: "Jana Nováková", lines: ["Masarykova 12", "602 00 Brno", "CZ"], companyId: "12345678", email: "lektor@example.com" }),
      },
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
