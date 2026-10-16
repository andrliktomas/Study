import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { platformFeePercent } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ceník – zdarma, platíte jen provizi z prodaných lekcí",
  description: "Žádný měsíční poplatek ani paušál. Platforma si bere jen provizi z lekcí, které lektor skutečně prodá.",
  alternates: { canonical: "/cenik" },
};

export default function PricingPage() {
  const fee = platformFeePercent();
  const example = 450000;
  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Ceník</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Zdarma. Opravdu.</h1>
        <p className="mt-4 text-lg text-ink-soft">Žádné paušály, žádné měsíční poplatky. Vyděláváme jen tehdy, když vyděláváte vy.</p>
      </div>
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold">Pro studenty</h2>
          <p className="mt-4 text-5xl font-extrabold">0 Kč</p>
          <p className="mt-2 text-sm text-ink-soft">Platíte jen cenu lekcí, kterou stanoví lektor.</p>
        </div>
        <div className="card relative border-brand-200 shadow-glow">
          <span className="badge absolute right-5 top-5 bg-brand-500 text-white">Lektoři</span>
          <h2 className="text-lg font-semibold">Pro lektory</h2>
          <p className="mt-4 text-5xl font-extrabold">{fee} %</p>
          <p className="mt-2 text-sm text-ink-soft">z ceny prodaných lekcí. Profil, evidence studentů, kalendář i inzerce zdarma.</p>
          <div className="mt-6 rounded-xl bg-brand-50 p-4 text-sm">
            Příklad: student koupí balíček za <strong>{formatMoney(example)}</strong> → lektor obdrží{" "}
            <strong>{formatMoney(example - Math.round((example * fee) / 100))}</strong> (před poplatky platební brány).
          </div>
          <Link href="/registrace?role=tutor" className="btn-primary mt-6 w-full">Založit profil</Link>
        </div>
      </div>
    </div>
  );
}
