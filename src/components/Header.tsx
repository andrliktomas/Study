import Link from "next/link";
import { HeaderAuth } from "./HeaderAuth";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

const NAV = [
  { href: "/lektori", label: "Najít lektora" },
  { href: "/pro-lektory", label: "Pro lektory" },
  { href: "/cenik", label: "Ceník" },
  { href: "/blog", label: "Blog" },
];

// Hlavička je statická – stav přihlášení se načítá až v prohlížeči, takže veřejné stránky
// mohou být předgenerované a cachované (rychlejší načtení = lepší SEO).
export function Header() {
  return (
    <header className="sticky top-0 z-40 print:hidden border-b border-slate-100/80 bg-white/80 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Hlavní navigace">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="btn-ghost">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <HeaderAuth />
        </div>
        <MobileMenu nav={NAV} />
      </div>
    </header>
  );
}
