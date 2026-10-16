import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { SignOutButton } from "./SignOutButton";

const NAV = [
  { href: "/lektori", label: "Najít lektora" },
  { href: "/pro-lektory", label: "Pro lektory" },
  { href: "/cenik", label: "Ceník" },
];

export async function Header() {
  const session = await getServerSession(authOptions);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100/80 bg-white/80 backdrop-blur-lg">
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
          {session ? (
            <>
              <Link href="/dashboard" className="btn-primary">
                Můj přehled
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/prihlaseni" className="btn-ghost">
                Přihlásit se
              </Link>
              <Link href="/registrace" className="btn-primary">
                Začít zdarma
              </Link>
            </>
          )}
        </div>
        <MobileMenu nav={NAV} loggedIn={Boolean(session)} />
      </div>
    </header>
  );
}
