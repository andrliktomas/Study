"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TUTOR_LINKS = [
  { href: "/dashboard", label: "Přehled", icon: "🏠" },
  { href: "/dashboard/lekce", label: "Lekce", icon: "🗓️" },
  { href: "/dashboard/studenti", label: "Studenti", icon: "👥" },
  { href: "/dashboard/balicky", label: "Balíčky a ceny", icon: "🎟️" },
  { href: "/dashboard/dostupnost", label: "Dostupnost", icon: "⏰" },
  { href: "/dashboard/profil", label: "Veřejný profil", icon: "🪪" },
  { href: "/dashboard/vyplaty", label: "Platby a výplaty", icon: "💳" },
];

export function DashboardNav({
  isTutor,
  profileSlug,
  tutors,
}: {
  isTutor: boolean;
  profileSlug: string | null;
  tutors: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const item = (href: string, label: string, icon: string) => {
    const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
          active ? "bg-brand-500 text-white shadow-glow" : "text-ink-soft hover:bg-brand-50 hover:text-brand-700"
        }`}
      >
        <span aria-hidden>{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible" aria-label="Navigace v přehledu">
        {isTutor ? TUTOR_LINKS.map((l) => item(l.href, l.label, l.icon)) : item("/dashboard", "Přehled", "🏠")}
        {tutors.length > 0 && (
          <>
            <p className="hidden px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-faint lg:block">Moje výuka</p>
            {tutors.map((t) => item(`/dashboard/lektor/${t.id}`, t.name, "📘"))}
          </>
        )}
        <p className="hidden px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-ink-faint lg:block">Účet</p>
        {item("/dashboard/nastaveni", "Nastavení", "⚙️")}
        {profileSlug && (
          <Link href={`/lektori/${profileSlug}`} className="flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-brand-600 hover:bg-brand-50">
            <span aria-hidden>↗</span> Zobrazit můj profil
          </Link>
        )}
      </nav>
    </aside>
  );
}
