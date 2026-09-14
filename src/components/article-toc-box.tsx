import { ListTree } from "lucide-react";
import type { ArticleTocSection } from "@/lib/article-toc";

export function ArticleTocBox({ sections }: { sections: ArticleTocSection[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="mb-8 rounded-lg border-e-[3px] border-[var(--brand-accent)] bg-[var(--surface-secondary)] px-5 py-[18px]">
      <div className="mb-2.5 flex items-center gap-1.5 text-[13.5px] font-bold"><ListTree size={16} />فهرست مطالب</div>
      <div className="flex flex-col gap-2">
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="text-[13px] text-[var(--foreground)] hover:text-[var(--brand-accent)]">{section.heading}</a>
        ))}
      </div>
    </div>
  );
}
