import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/session";
import { AvailabilityForm } from "./AvailabilityForm";

export default async function AvailabilityPage() {
  const { user, profile } = await requireTutor();
  const rows = await db.availability.findMany({ where: { tutorId: profile.id }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] });
  return (
    <>
      <PageHeader
        title="Kdy učíte"
        description={<>Týdenní bloky, ve kterých si studenti mohou rezervovat lekce. Časy jsou v pásmu <strong>{user.timezone}</strong>.{profile.calendarSync && " Obsazené časy z Google Kalendáře se automaticky vynechají."}</>}
      />
      <AvailabilityForm initial={rows.map((r) => ({ weekday: r.weekday, start: r.startMinute, end: r.endMinute }))} />
    </>
  );
}
