import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ChevronLeft, CircleAlert, ImageIcon, Info, PackageSearch, TriangleAlert } from "lucide-react";

type NoticeTone = "success" | "warning" | "danger" | "info";

const noticeTone: Record<NoticeTone, { wrap: string; badge: string; title: string; icon: typeof Info }> = {
  success: {
    wrap: "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))]",
    badge: "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]",
    title: "text-[var(--success)]",
    icon: CheckCircle2,
  },
  warning: {
    wrap: "border-[color-mix(in_srgb,var(--warning)_38%,transparent)] bg-[color-mix(in_srgb,var(--warning)_11%,var(--surface))]",
    badge: "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--warning)]",
    title: "text-[var(--warning)]",
    icon: TriangleAlert,
  },
  danger: {
    wrap: "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,var(--surface))]",
    badge: "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]",
    title: "text-[var(--danger)]",
    icon: CircleAlert,
  },
  info: {
    wrap: "border-[color-mix(in_srgb,var(--info)_35%,transparent)] bg-[color-mix(in_srgb,var(--info)_9%,var(--surface))]",
    badge: "bg-[color-mix(in_srgb,var(--info)_16%,transparent)] text-[var(--info)]",
    title: "text-[var(--info)]",
    icon: Info,
  },
};

/**
 * The standard result/status banner across the account area — payment outcome, wallet top-up
 * result, guest-account reminders. Self-contained (icon, coloured heading, supporting line) so it
 * reads at a glance instead of the flat, unlabelled box the bare HeroUI alert produced here.
 */
export function AccountNotice({ tone, title, children }: { tone: NoticeTone; title: string; children?: ReactNode }) {
  const styles = noticeTone[tone];
  const Icon = styles.icon;
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${styles.wrap}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${styles.badge}`}><Icon size={18} /></span>
      <div className="min-w-0 pt-1">
        <strong className={`block text-sm font-bold leading-6 ${styles.title}`}>{title}</strong>
        {children && <p className="mb-0 mt-1 text-xs leading-6 text-[var(--muted)]">{children}</p>}
      </div>
    </div>
  );
}

export function AccountEmptyState({ title, description, href = "/products", linkLabel = "مشاهده محصولات", embedded = false }: { title: string; description: string; href?: string; linkLabel?: string; embedded?: boolean }) {
  return <div className={`grid min-h-64 place-items-center bg-[var(--surface)] p-6 text-center ${embedded ? "" : "rounded-2xl border border-dashed border-[var(--border)]"}`}><div><PackageSearch size={42} className="mx-auto text-[var(--muted)]" /><strong className="mt-4 block text-sm">{title}</strong><p className="mx-auto mb-0 mt-2 max-w-md text-xs leading-6 text-[var(--muted)]">{description}</p><Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">{linkLabel}<ChevronLeft size={15} /></Link></div></div>;
}

export type AccountProductItem = { id: string; name: string; slug: string; category: string | null; image: { url: string; alt: string | null } | null };

export function AccountProductCard({ item, meta, action }: { item: AccountProductItem; meta?: ReactNode; action?: ReactNode }) {
  return <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Link href={`/products/${item.slug}`} className="group block"><div className="relative grid aspect-square place-items-center bg-white">{item.image ? <Image src={item.image.url} alt={item.image.alt ?? item.name} fill sizes="(max-width:640px) 50vw, 240px" className="object-contain p-5 transition group-hover:scale-[1.03]" /> : <ImageIcon size={42} className="text-slate-300" />}</div><div className="border-t border-[var(--border)] p-4"><span className="text-[11px] text-[var(--brand-primary)]">{item.category ?? "محصول"}</span><h2 className="mb-0 mt-2 line-clamp-2 min-h-12 text-sm font-bold leading-6">{item.name}</h2>{meta && <div className="mt-3 text-xs text-[var(--muted)]">{meta}</div>}</div></Link>{action && <div className="border-t border-[var(--border)] p-3">{action}</div>}</article>;
}
