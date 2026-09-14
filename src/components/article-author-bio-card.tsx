import Image from "next/image";
import { UserRound } from "lucide-react";

type Author = { name: string; bio: string | null; avatar: { url: string; alt: string | null } | null };

export function ArticleAuthorBioCard({ author }: { author: Author }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-tertiary)] text-[var(--muted)]">
        {author.avatar ? <Image src={author.avatar.url} alt={author.avatar.alt ?? author.name} fill sizes="48px" className="object-cover" /> : <UserRound size={20} />}
      </span>
      <div className="min-w-0">
        <div className="mb-0.5 text-[13.5px] font-bold text-[var(--foreground)]">{author.name}</div>
        {author.bio && <p className="m-0 text-[11.5px] leading-6 text-[var(--muted)]">{author.bio}</p>}
      </div>
    </div>
  );
}
