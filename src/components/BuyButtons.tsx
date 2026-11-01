"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { startCheckout, startTransfer } from "@/app/actions/student";
import { SubmitButton } from "./SubmitButton";

/** Tlačítka nákupu – přihlášení se zjišťuje na klientovi, aby veřejný profil mohl být statický. */
export function BuyButtons({ packageId, returnTo, payment }: { packageId: string; returnTo: string; payment: { card: boolean; transfer: boolean } }) {
  const { status } = useSession();
  if (status !== "authenticated") {
    return (
      <Link href={`/registrace?callbackUrl=${encodeURIComponent(returnTo)}`} className="btn-primary mt-3 w-full" aria-disabled={status === "loading"}>
        Koupit
      </Link>
    );
  }
  if (!payment.card && !payment.transfer) return <p className="mt-3 text-xs text-ink-faint">Lektor zatím nepřijímá platby.</p>;
  return (
    <div className={`mt-3 grid gap-2 ${payment.card && payment.transfer ? "grid-cols-2" : ""}`}>
      {payment.card && (
        <form action={startCheckout}>
          <input type="hidden" name="packageId" value={packageId} />
          <SubmitButton className="btn-primary w-full" pendingText="Přesměrovávám…">{payment.transfer ? "Kartou" : "Koupit"}</SubmitButton>
        </form>
      )}
      {payment.transfer && (
        <form action={startTransfer}>
          <input type="hidden" name="packageId" value={packageId} />
          <SubmitButton className={payment.card ? "btn-secondary w-full" : "btn-primary w-full"} pendingText="Připravuji…">
            {payment.card ? "Převodem (QR)" : "Koupit (převodem)"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
