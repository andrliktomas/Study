import Link from "next/link";
import { LANGUAGES } from "@/lib/languages";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-100 bg-gradient-to-b from-white to-brand-50/60">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-4 text-sm text-ink-soft">{site.description}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Lektoři podle jazyka</h2>
          <ul className="space-y-2 text-sm">
            {LANGUAGES.slice(0, 6).map((l) => (
              <li key={l.code}>
                <Link href={`/jazyky/${l.slug}`} className="text-ink-soft hover:text-brand-600">
                  Online lektor {l.genitive}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Platforma</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/lektori" className="text-ink-soft hover:text-brand-600">Katalog lektorů</Link></li>
            <li><Link href="/pro-lektory" className="text-ink-soft hover:text-brand-600">Pro lektory</Link></li>
            <li><Link href="/cenik" className="text-ink-soft hover:text-brand-600">Ceník</Link></li>
            <li><Link href="/registrace?role=tutor" className="text-ink-soft hover:text-brand-600">Založit profil lektora</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Účet</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/prihlaseni" className="text-ink-soft hover:text-brand-600">Přihlášení</Link></li>
            <li><Link href="/registrace" className="text-ink-soft hover:text-brand-600">Registrace</Link></li>
            <li><Link href="/zapomenute-heslo" className="text-ink-soft hover:text-brand-600">Zapomenuté heslo</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-6 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} {site.name}. Všechna práva vyhrazena.
      </div>
    </footer>
  );
}
