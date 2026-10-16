import { setCalendarSync } from "@/app/actions/tutor";
import { Notice, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { googleEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasCalendarScope } from "@/lib/google-calendar";
import { requireUser } from "@/lib/session";
import { AccountForm, ConnectCalendarButton, PasswordForm } from "./forms";

export default async function SettingsPage({ searchParams }: { searchParams: { chyba?: string } }) {
  const user = await requireUser();
  const [profile, google] = await Promise.all([
    db.tutorProfile.findUnique({ where: { userId: user.id } }),
    db.account.findFirst({ where: { userId: user.id, provider: "google" } }),
  ]);
  const calendarConnected = hasCalendarScope(google?.scope);

  return (
    <>
      <PageHeader title="Nastavení" />
      {searchParams.chyba === "kalendar" && <Notice tone="error">Nejdřív připojte Google Kalendář (udělte přístup ke kalendáři).</Notice>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Účet</h2>
          <div className="mt-4"><AccountForm name={user.name ?? ""} email={user.email} timezone={user.timezone} /></div>
        </section>

        <section className="card">
          <h2 className="font-semibold">{user.passwordHash ? "Změna hesla" : "Nastavit heslo"}</h2>
          {!user.passwordHash && <p className="mt-1 text-sm text-ink-soft">Přihlašujete se přes Google. Můžete si nastavit i heslo pro přihlášení e-mailem.</p>}
          <div className="mt-4"><PasswordForm hasPassword={Boolean(user.passwordHash)} /></div>
        </section>

        {profile && (
          <section className="card lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Google Kalendář</h2>
                <p className="mt-1 max-w-xl text-sm text-ink-soft">
                  Obsazené časy z vašeho kalendáře se studentům nezobrazí jako volné a každá rezervace se zapíše do kalendáře
                  i s odkazem na Google Meet. Student dostane pozvánku do svého kalendáře.
                </p>
              </div>
              <span className={`badge ${profile.calendarSync ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-ink-faint"}`}>
                {profile.calendarSync ? "Synchronizace zapnutá" : "Vypnuto"}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {!googleEnabled ? (
                <p className="text-sm text-ink-faint">Přihlášení přes Google není na serveru nakonfigurováno.</p>
              ) : !calendarConnected ? (
                <ConnectCalendarButton />
              ) : (
                <form action={setCalendarSync}>
                  <input type="hidden" name="enable" value={profile.calendarSync ? "0" : "1"} />
                  <SubmitButton className={profile.calendarSync ? "btn-secondary" : "btn-primary"}>
                    {profile.calendarSync ? "Vypnout synchronizaci" : "Zapnout synchronizaci"}
                  </SubmitButton>
                </form>
              )}
              {calendarConnected && <ConnectCalendarButton label="Znovu propojit" secondary />}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
