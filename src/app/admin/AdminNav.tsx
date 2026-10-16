"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/lektori", label: "Lektoři" },
  { href: "/admin/uzivatele", label: "Uživatelé" },
  { href: "/admin/platby", label: "Platby a provize" },
  { href: "/admin/hodnoceni", label: "Hodnocení" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl bg-brand-50 p-1 text-sm font-medium">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`rounded-lg px-3.5 py-1.5 transition ${active ? "bg-white text-brand-700 shadow-soft" : "text-ink-soft hover:text-brand-700"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
