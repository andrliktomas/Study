import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { db } from "@/lib/db";
import { formatBytes } from "@/lib/files";
import { formatDateTime } from "@/lib/format";
import { getConversation } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { AutoRefresh, Composer } from "./client";

const URL_RE = /(https?:\/\/[^\s<]+)/g;

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline">{part}</a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default async function ThreadPage({ params }: { params: { enrollmentId: string } }) {
  const user = await requireUser();
  const conv = await getConversation(params.enrollmentId, user.id);
  if (!conv) notFound();

  // otevřením konverzace označíme zprávy od druhé strany jako přečtené
  await db.message.updateMany({ where: { enrollmentId: params.enrollmentId, senderId: { not: user.id }, readAt: null }, data: { readAt: new Date() } });
  const messages = await db.message.findMany({
    where: { enrollmentId: params.enrollmentId },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { file: { select: { id: true, filename: true, size: true, mimeType: true } } },
  });
  const files = messages.filter((m) => m.file).reverse();
  const otherLink = conv.isTutor ? `/dashboard/studenti/${conv.enrollment.studentId}` : `/dashboard/lektor/${conv.enrollment.tutorId}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <AutoRefresh seconds={15} />
      <section className="card flex min-h-[60vh] flex-col p-0">
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Link href="/dashboard/zpravy" className="btn-ghost px-2" aria-label="Zpět na zprávy">←</Link>
          <Avatar name={conv.other.name} image={conv.other.image} size={40} />
          <div>
            <Link href={otherLink} className="font-semibold hover:text-brand-700">{conv.other.name ?? conv.other.email}</Link>
            <p className="text-xs text-ink-faint">{conv.isTutor ? "student" : "lektor"}</p>
          </div>
        </header>
        <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.length === 0 && <li className="py-10 text-center text-sm text-ink-faint">Zatím žádné zprávy. Napište první!</li>}
          {messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-br-md bg-brand-500 text-white" : "rounded-bl-md bg-slate-100 text-ink"}`}>
                  {m.body && <p className="whitespace-pre-wrap break-words"><Linkified text={m.body} /></p>}
                  {m.file && (
                    <a
                      href={`/api/soubory/${m.file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-1 flex items-center gap-2 rounded-lg px-3 py-2 ${mine ? "bg-white/15 hover:bg-white/25" : "bg-white hover:bg-brand-50"}`}
                    >
                      <span aria-hidden>📎</span>
                      <span className="min-w-0 truncate font-medium">{m.file.filename}</span>
                      <span className={`text-xs ${mine ? "text-brand-50" : "text-ink-faint"}`}>{formatBytes(m.file.size)}</span>
                    </a>
                  )}
                  <p className={`mt-1 text-right text-[11px] ${mine ? "text-brand-50" : "text-ink-faint"}`}>
                    {formatDateTime(m.createdAt, user.timezone)}
                    {mine && m.readAt && " · přečteno"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="border-t border-slate-100 p-4">
          <Composer enrollmentId={params.enrollmentId} />
        </div>
      </section>
      <aside className="card self-start">
        <h2 className="font-semibold">Materiály</h2>
        {files.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">Soubory, které si pošlete, najdete tady.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {files.map((m) => (
              <li key={m.id}>
                <a href={`/api/soubory/${m.file!.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-50">
                  <span aria-hidden>📄</span>
                  <span className="min-w-0 flex-1 truncate">{m.file!.filename}</span>
                  <span className="text-xs text-ink-faint">{formatBytes(m.file!.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
