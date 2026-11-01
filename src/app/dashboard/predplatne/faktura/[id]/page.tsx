import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/session";

export default async function TutorInvoicePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { profile } = await requireTutor();
  const invoice = await db.invoice.findFirst({ where: { id, tutorId: profile.id } });
  if (!invoice) notFound();
  return (
    <>
      <Link href="/dashboard/predplatne" className="btn-ghost mb-4 print:hidden">← Předplatné</Link>
      <InvoiceDocument invoice={invoice} />
    </>
  );
}
