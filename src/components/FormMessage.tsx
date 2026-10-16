export type FormState = { ok?: boolean; error?: string; message?: string } | null;

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>;
  if (state.message)
    return <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{state.message}</p>;
  return null;
}
