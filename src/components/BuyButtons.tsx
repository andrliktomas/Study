"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { startTransfer } from "@/app/actions/student";
import { SubmitButton } from "./SubmitButton";

/** Tlačítko nákupu – přihlášení se zjišťuje na klientovi, aby veřejný profil mohl být statický. */
export function BuyButtons({ packageId, returnTo }: { packageId: string; returnTo: string }) {
  const { status } = useSession();
  if (status !== "authenticated") {
    return (
      <Link href={`/registrace?callbackUrl=${encodeURIComponent(returnTo)}`} className="btn-primary mt-3 w-full" aria-disabled={status === "loading"}>
        Koupit
      </Link>
    );
  }
  return (
    <form action={startTransfer} className="mt-3">
      <input type="hidden" name="packageId" value={packageId} />
      <SubmitButton className="btn-primary w-full" pendingText="Připravuji…">Koupit – platba převodem</SubmitButton>
    </form>
  );
}
