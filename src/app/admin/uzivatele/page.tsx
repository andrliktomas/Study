import { setAdminRole } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

const ROLE: Record<string, string> = { ADMIN: "Admin", TUTOR: "Lektor", STUDENT: "Student" };

export default async function AdminUsers({ searchParams }: { searchParams: { q?: string } }) {
  const me = await requireAdmin();
  const q = searchParams.q?.trim();
  const users = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {},
    include: { accounts: { select: { provider: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Uživatelé" description={`Zobrazeno ${users.length}`} />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Hledat jméno, e-mail…" className="input max-w-sm" /><button className="btn-secondary">Hledat</button></form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-3 font-medium">Uživatel</th><th className="p-3 font-medium">Role</th><th className="p-3 font-medium">Přihlášení</th><th className="p-3 font-medium">Registrace</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-brand-50/40">
                <td className="p-3"><p className="font-medium">{u.name}</p><p className="text-xs text-ink-faint">{u.email}</p></td>
                <td className="p-3"><span className={`badge ${u.role === "ADMIN" ? "bg-ink text-white" : "bg-slate-100 text-ink-soft"}`}>{ROLE[u.role] ?? u.role}</span></td>
                <td className="p-3 text-xs text-ink-soft">{[u.passwordHash && "heslo", ...u.accounts.map((a) => a.provider)].filter(Boolean).join(", ")}</td>
                <td className="p-3 text-ink-soft">{formatDate(u.createdAt)}</td>
                <td className="p-3 text-right">
                  {u.id !== me.id && (
                    <form action={setAdminRole}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="admin" value={u.role === "ADMIN" ? "0" : "1"} />
                      <SubmitButton className="btn-ghost px-3 py-1.5 text-xs" pendingText="…">{u.role === "ADMIN" ? "Odebrat admina" : "Udělat adminem"}</SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
