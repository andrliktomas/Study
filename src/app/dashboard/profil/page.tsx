import { PageHeader } from "@/components/PageHeader";
import { parseList } from "@/lib/languages";
import { requireTutor } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const { profile } = await requireTutor();
  return (
    <>
      <PageHeader title="Veřejný profil" description="Takhle vás uvidí studenti v katalogu a ve vyhledávačích." />
      <ProfileForm
        baseUrl={absoluteUrl("/lektori/")}
        initial={{
          headline: profile.headline,
          bio: profile.bio,
          city: profile.city ?? "",
          videoLink: profile.videoLink ?? "",
          slug: profile.slug,
          minNoticeHours: profile.minNoticeHours,
          cancelHours: profile.cancelHours,
          published: profile.published,
          languages: parseList(profile.languages),
          levels: parseList(profile.levels),
        }}
      />
    </>
  );
}
