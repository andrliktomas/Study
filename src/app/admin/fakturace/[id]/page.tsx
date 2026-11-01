import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { db } from "@/lib/db";

export default async function AdminInvoicePage(props: { params: Promise<{ id: string }> }) {
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
