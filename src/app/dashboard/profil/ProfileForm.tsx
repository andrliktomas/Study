"use client";
import { useState } from "react";
import { useFormState } from "react-dom";
import { updateTutorProfile } from "@/app/actions/tutor";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { LANGUAGES, LEVELS } from "@/lib/languages";

type Initial = {
  headline: string; bio: string; city: string; videoLink: string; slug: string;
  minNoticeHours: number; cancelHours: number; published: boolean; languages: string[]; levels: string[];
};

export function ProfileForm({ initial, baseUrl }: { initial: Initial; baseUrl: string }) {
  const [state, action] = useFormState(updateTutorProfile, null);
  const [bio, setBio] = useState(initial.bio);
  const [slug, setSlug] = useState(initial.slug);

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <section className="card space-y-5">
        <div>
          <label htmlFor="headline" className="label">Krátký popis</label>
          <input id="headline" name="headline" defaultValue={initial.headline} maxLength={120} placeholder="např. Angličtina pro dospělé a business English" className="input" />
          <p className="hint">Zobrazí se pod jménem a v titulku stránky – důležité pro Google.</p>
        </div>
        <div>
          <label htmlFor="bio" className="label">O mně</label>
          <textarea id="bio" name="bio" rows={8} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={5000} className="input" placeholder="Představte se: zkušenosti, jak učíte, pro koho jsou vaše lekce…" />
          <p className="hint">{bio.length} / 5000 znaků {bio.length < 50 && "· pro zveřejnění alespoň 50"}</p>
        </div>
        <fieldset>
          <legend className="label">Vyučované jazyky</legend>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <label key={l.code} className="cursor-pointer">
                <input type="checkbox" name="languages" value={l.code} defaultChecked={initial.languages.includes(l.code)} className="peer sr-only" />
                <span className="chip px-3.5 py-1.5 text-sm transition peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300">{l.flag} {l.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Úrovně</legend>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((lv) => (
              <label key={lv} className="cursor-pointer">
                <input type="checkbox" name="levels" value={lv} defaultChecked={initial.levels.includes(lv)} className="peer sr-only" />
                <span className="chip px-3.5 py-1.5 text-sm transition peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-white">{lv}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="label">Město (nepovinné)</label>
            <input id="city" name="city" defaultValue={initial.city} className="input" />
          </div>
          <div>
            <label htmlFor="videoLink" className="label">Stálý odkaz na videohovor (nepovinné)</label>
            <input id="videoLink" name="videoLink" type="url" defaultValue={initial.videoLink} placeholder="https://zoom.us/j/…" className="input" />
            <p className="hint">Když nevyplníte a máte připojený Google Kalendář, vytvoří se Google Meet.</p>
          </div>
        </div>
      </section>

      <section className="card space-y-5">
        <h2 className="font-semibold">Pravidla rezervací</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="minNoticeHours" className="label">Minimální předstih rezervace (hodiny)</label>
            <input id="minNoticeHours" name="minNoticeHours" type="number" min={0} defaultValue={initial.minNoticeHours} className="input" />
          </div>
          <div>
            <label htmlFor="cancelHours" className="label">Bezplatné storno do (hodin před lekcí)</label>
            <input id="cancelHours" name="cancelHours" type="number" min={0} defaultValue={initial.cancelHours} className="input" />
          </div>
        </div>
      </section>

      <section className="card space-y-5">
        <div>
          <label htmlFor="slug" className="label">Adresa profilu</label>
          <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
            <span className="hidden pl-3.5 text-sm text-ink-faint sm:inline">{baseUrl}</span>
            <input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl bg-transparent px-2 py-2.5 text-sm focus:outline-none" />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" name="published" defaultChecked={initial.published} className="peer sr-only" />
          <span className="relative h-6 w-11 rounded-full bg-slate-200 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-brand-500 peer-checked:after:translate-x-5" />
          <span className="text-sm font-medium">Zveřejnit profil v katalogu lektorů</span>
        </label>
      </section>

      <div className="flex justify-end"><SubmitButton>Uložit profil</SubmitButton></div>
    </form>
  );
}
