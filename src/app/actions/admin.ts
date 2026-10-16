"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function setTutorSuspended(formData: FormData) {
  await requireAdmin();
  const suspended = formData.get("suspended") === "1";
  const t = await db.tutorProfile.update({ where: { id: String(formData.get("tutorId")) }, data: { suspended } });
  revalidatePath("/admin", "layout");
  revalidatePath("/lektori");
  revalidatePath(`/lektori/${t.slug}`);
}

export async function setReviewHidden(formData: FormData) {
  await requireAdmin();
  const r = await db.review.update({
    where: { id: String(formData.get("reviewId")) },
    data: { hidden: formData.get("hidden") === "1" },
    include: { tutor: { select: { slug: true } } },
  });
  revalidatePath("/admin/hodnoceni");
  revalidatePath(`/lektori/${r.tutor.slug}`);
}

export async function settleFee(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("purchaseId").map(String);
  await db.purchase.updateMany({ where: { id: { in: ids }, source: "MANUAL", feeSettledAt: null }, data: { feeSettledAt: new Date() } });
  revalidatePath("/admin", "layout");
}

export async function setAdminRole(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId"));
  if (userId === me.id) return; // sám sobě práva neodebere
  const makeAdmin = formData.get("admin") === "1";
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { tutorProfile: { select: { id: true } } } });
  await db.user.update({
    where: { id: userId },
    data: { role: makeAdmin ? "ADMIN" : user.tutorProfile ? "TUTOR" : "STUDENT" },
  });
  revalidatePath("/admin/uzivatele");
}
