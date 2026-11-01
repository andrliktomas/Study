"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function HeaderAuth() {
  const { data: session, status } = useSession();
  if (status === "loading") return <span className="h-10 w-40 animate-pulse rounded-xl bg-slate-100" aria-hidden />;
  if (!session) {
    return (
      <>
        <Link href="/prihlaseni" className="btn-ghost">Přihlásit se</Link>
        <Link href="/registrace" className="btn-primary">Začít zdarma</Link>
      </>
    );
  }
  return (
    <>
      {session.user.role === "ADMIN" && <Link href="/admin" className="btn-ghost">Administrace</Link>}
      <Link href="/dashboard" className="btn-primary">Můj přehled</Link>
      <button type="button" className="btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>Odhlásit</button>
    </>
  );
}
