import { db } from "./db";

/** Konverzace (zápisy), kterých se uživatel účastní – jako lektor nebo jako student. */
export function participantWhere(userId: string) {
  return { OR: [{ studentId: userId }, { tutor: { userId } }] };
}

export async function unreadMessageCount(userId: string) {
  return db.message.count({
    where: { readAt: null, senderId: { not: userId }, enrollment: participantWhere(userId) },
  });
}

/** Může uživatel číst a psát v konverzaci daného zápisu? */
export async function getConversation(enrollmentId: string, userId: string) {
  const e = await db.enrollment.findFirst({
    where: { id: enrollmentId, ...participantWhere(userId) },
    include: { student: true, tutor: { include: { user: true } } },
  });
  if (!e) return null;
  const isTutor = e.tutor.userId === userId;
  return { enrollment: e, isTutor, other: isTutor ? e.student : e.tutor.user };
}
