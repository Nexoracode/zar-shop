import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ImageIcon, PackageSearch } from "lucide-react";

export function AccountPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div><h1 className="m-0 text-lg font-black sm:text-xl">{title}</h1><p className="mb-0 mt-2 text-xs text-[var(--muted)]">{description}</p></div>{action}</header>;
}

export function AccountEmptyState({ title, description, href = "/products", linkLabel = "مشاهده محصولات" }: { title: string; description: string; href?: string; linkLabel?: string }) {
  return <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center"><div><PackageSearch size={42} className="mx-auto text-[var(--muted)]" /><strong className="mt-4 block text-sm">{title}</strong><p className="mx-auto mb-0 mt-2 max-w-md text-xs leading-6 text-[var(--muted)]">{description}</p><Link href={href} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]">{linkLabel}<ChevronLeft size={15} /></Link></div></div>;
}

export type AccountProductItem = { id: string; name: string; slug: string; category: string | null; image: { url: string; alt: string | null } | null };

export function AccountProductCard({ item, meta, action }: { item: AccountProductItem; meta?: ReactNode; action?: ReactNode }) {
  return <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><Link href={`/products/${item.slug}`} className="group block"><div className="relative grid aspect-square place-items-center bg-white">{item.image ? <Image src={item.image.url} alt={item.image.alt ?? item.name} fill sizes="(max-width:640px) 50vw, 240px" className="object-contain p-5 transition group-hover:scale-[1.03]" /> : <ImageIcon size={42} className="text-slate-300" />}</div><div className="border-t border-[var(--border)] p-4"><span className="text-[11px] text-[var(--brand-primary)]">{item.category ?? "محصول"}</span><h2 className="mb-0 mt-2 line-clamp-2 min-h-12 text-sm font-bold leading-6">{item.name}</h2>{meta && <div className="mt-3 text-xs text-[var(--muted)]">{meta}</div>}</div></Link>{action && <div className="border-t border-[var(--border)] p-3">{action}</div>}</article>;
}
