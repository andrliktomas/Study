import type { TutorBankAccount } from "@prisma/client";

/** Lektor může přijímat platby, pokud má aspoň jeden bankovní účet. */
export function canAcceptPayments(profile: { bankAccounts: unknown[] }) {
  return profile.bankAccounts.length > 0;
}

export function accountFor<T extends Pick<TutorBankAccount, "currency">>(accounts: T[], currency: string) {
  return accounts.find((a) => a.currency === currency.toLowerCase()) ?? null;
}

/** Reference platby: variabilní symbol pro české banky, pro zahraniční platby s prefixem. */
export function paymentReference(vs: string) {
  return `LK${vs}`;
}
