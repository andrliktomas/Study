import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AdminInvoicePage(props: { params: Promise<{ id: string }> }) {
  // kontrola i ve stránce: layout se při klientské navigaci nemusí znovu vykonat
  await requireAdmin();
  const { id } = await props.params;
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice) notFound();
  return (
    <>
      <Link href="/admin/fakturace" className="btn-ghost mb-4 print:hidden">← Fakturace</Link>
      <InvoiceDocument invoice={invoice} />
    </>
  );
}
