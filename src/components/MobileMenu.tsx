"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export function MobileMenu({ nav, loggedIn }: { nav: { href: string; label: string }[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="btn-ghost px-2"
        aria-expanded={open}
        aria-label={open ? "Zavřít menu" : "Otevřít menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 animate-fade-up border-b border-slate-100 bg-white p-4 shadow-soft">
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="btn-ghost justify-start">
                {n.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-slate-100" />
            {loggedIn ? (
              <>
                <Link href="/dashboard" className="btn-primary">Můj přehled</Link>
                <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>Odhlásit se</button>
              </>
            ) : (
              <>
                <Link href="/prihlaseni" className="btn-secondary">Přihlásit se</Link>
                <Link href="/registrace" className="btn-primary">Začít zdarma</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
