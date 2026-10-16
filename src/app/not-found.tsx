import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="text-7xl font-extrabold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-bold">Stránka nenalezena</h1>
      <p className="mt-2 text-ink-soft">Tahle stránka neexistuje nebo byla přesunuta.</p>
      <Link href="/" className="btn-primary mt-8">Zpět na úvod</Link>
    </div>
  );
}
