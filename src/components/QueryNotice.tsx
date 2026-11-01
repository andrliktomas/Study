"use client";
import { useSearchParams } from "next/navigation";

/** Chybová hláška podle ?chyba=… – na klientovi, aby stránka mohla zůstat statická. */
export function QueryNotice({ messages, param = "chyba", tone = "error" }: { messages: Record<string, string>; param?: string; tone?: "error" | "success" }) {
  const value = useSearchParams().get(param);
  const msg = value ? messages[value] : undefined;
  if (!msg) return null;
  const cls = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800";
  return <div role={tone === "error" ? "alert" : "status"} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${cls}`}>{msg}</div>;
}
