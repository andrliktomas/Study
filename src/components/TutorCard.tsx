import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { languageByCode, parseList } from "@/lib/languages";
import { lowestLessonPrice, type PublicTutor } from "@/lib/tutors";
import { Avatar } from "./Avatar";
import { RatingSummary } from "./Stars";

export function TutorCard({ tutor }: { tutor: PublicTutor }) {
  const price = lowestLessonPrice(tutor);
  const hasTrial = tutor.packages.some((p) => p.isTrial);
  return (
    <Link href={`/lektori/${tutor.slug}`} className="card-hover group flex flex-col">
      <div className="flex items-center gap-4">
        <Avatar name={tutor.user.name} image={tutor.user.image} size={56} />
        <div className="min-w-0">
          <h3 className="truncate font-semibold group-hover:text-brand-700">{tutor.user.name}</h3>
          <p className="line-clamp-1 text-sm text-ink-soft">{tutor.headline || "Online lektor"}</p>
          <RatingSummary avg={tutor.rating.avg} count={tutor.rating.count} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {parseList(tutor.languages).map((c) => {
          const l = languageByCode(c);
          return l ? <span key={c} className="chip">{l.flag} {l.name}</span> : null;
        })}
      </div>
      <p className="mt-4 line-clamp-3 flex-1 text-sm text-ink-soft">{tutor.bio}</p>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm">
          {price ? (
            <>od <strong className="text-lg text-ink">{formatMoney(price.cents, price.currency)}</strong> / lekce</>
          ) : (
            <span className="text-ink-faint">Ceník na profilu</span>
          )}
        </span>
        {hasTrial && <span className="badge bg-brand-100 text-brand-800">Zkušební lekce</span>}
      </div>
    </Link>
  );
}
