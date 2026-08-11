import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";

const galleryImageBackgrounds = [
  "linear-gradient(145deg, var(--surface), var(--surface-tertiary))",
  "linear-gradient(145deg, var(--surface-secondary), color-mix(in srgb, var(--foreground) 8%, var(--surface)))",
  "linear-gradient(145deg, var(--surface-tertiary), color-mix(in srgb, var(--foreground) 12%, var(--surface)))",
  "linear-gradient(145deg, color-mix(in srgb, var(--foreground) 5%, var(--surface)), color-mix(in srgb, var(--foreground) 15%, var(--surface)))",
] as const;

const generalImageBackgrounds = [
  "linear-gradient(145deg, color-mix(in srgb, var(--brand-primary) 4%, white), color-mix(in srgb, var(--brand-primary) 13%, white))",
  "linear-gradient(145deg, color-mix(in srgb, var(--brand-accent) 4%, white), color-mix(in srgb, var(--brand-accent) 13%, white))",
  "linear-gradient(145deg, color-mix(in srgb, var(--brand-primary) 5%, white), color-mix(in srgb, var(--brand-accent) 12%, white))",
  "linear-gradient(145deg, color-mix(in srgb, var(--brand-accent) 5%, white), color-mix(in srgb, var(--brand-primary) 12%, white))",
] as const;

function GeneralProductPlaceholder() {
  return <div className="h-full w-full bg-[var(--surface-tertiary)]" aria-hidden="true" />;
}

type ProductCardProps = {
  href: string;
  name: string;
  category: string;
  industry: "GOLD" | "GENERAL";
  weight: number;
  purity: number;
  makingFee?: { type: "PERCENT" | "FIXED"; value: number };
  discountPercent?: number;
  price: string;
  originalPrice?: string;
  image?: { src: string; alt: string };
  storefrontVariant?: "default" | "gallery" | "catalog";
  imageTone?: number;
  stock?: number;
  rating?: number;
  colors?: Array<{ id: string; name: string; hex: string }>;
};

export function ProductCard({ href, name, category, industry, weight, purity, makingFee, discountPercent, price, originalPrice, image, storefrontVariant = "default", imageTone = 0, stock, rating, colors = [] }: ProductCardProps) {
  if (storefrontVariant === "catalog") {
    return <Link href={href} className="group relative flex min-h-[390px] min-w-0 flex-col border-b border-l border-slate-200 bg-white p-4 transition duration-200 hover:z-10 hover:shadow-[0_6px_24px_rgba(0,0,0,.09)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]">
      {colors.length > 0 && <span className="absolute right-2 top-5 z-10 flex flex-col gap-0.5" aria-label={`${colors.length.toLocaleString("fa-IR")} رنگ موجود`}>
        {colors.slice(0, 5).map((color) => <span key={color.id} title={color.name} className="size-2.5 rounded-full border border-black/15 ring-1 ring-white" style={{ backgroundColor: color.hex }} />)}
      </span>}
      <div className="relative mx-auto aspect-square w-full max-w-[245px] overflow-hidden">
        {image ? <Image src={image.src} alt={image.alt} width={500} height={500} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.025]" /> : <GeneralProductPlaceholder />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col pt-3 text-right">
        <h3 className="m-0 line-clamp-2 min-h-12 text-[0.78rem] font-bold leading-6 text-slate-800">{name}</h3>
        <div className="mt-2 flex min-h-6 items-center justify-between gap-3">
          {stock !== undefined && stock > 0 && stock < 5 ? <span className="text-[0.66rem] font-bold text-[var(--danger)]">تنها {stock.toLocaleString("fa-IR")} عدد در انبار باقی مانده</span> : <span />}
          {rating !== undefined && <span className="mr-auto inline-flex shrink-0 items-center gap-1 text-[0.7rem] font-bold text-slate-700"><Star size={13} className="fill-amber-400 text-amber-400" />{rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</span>}
        </div>
        <div className="mt-auto grid min-h-[58px] content-end gap-1 pt-3">
          <div className="flex items-center justify-end gap-2">
            {discountPercent !== undefined && discountPercent > 0 && <span className="rounded-full bg-[var(--danger)] px-2 py-0.5 text-[0.65rem] font-black text-[var(--danger-foreground)]">٪{discountPercent.toLocaleString("fa-IR")}</span>}
            <strong className="text-sm font-black text-slate-900">{price}</strong>
          </div>
          {originalPrice ? <span className="pl-1 text-left text-[0.7rem] text-slate-400 line-through">{originalPrice}</span> : <span aria-hidden="true" className="invisible text-[0.7rem]">بدون تخفیف</span>}
        </div>
      </div>
    </Link>;
  }
  const isGallery = storefrontVariant === "gallery";
  const imageBackground = industry === "GENERAL" ? generalImageBackgrounds[Math.abs(imageTone) % generalImageBackgrounds.length] : galleryImageBackgrounds[Math.abs(imageTone) % galleryImageBackgrounds.length];
  return (
    <Link
      className={`group min-w-0 bg-white transition-all duration-[250ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${isGallery ? "block h-full" : "hover:-translate-y-[5px] hover:shadow-[0_18px_42px_color-mix(in_srgb,var(--brand-primary)_12%,transparent)]"}`}
      href={href}
    >
      {/* Media */}
      <div className={`relative overflow-hidden ${isGallery ? "aspect-square rounded-[7px]" : "aspect-[1/1.08] bg-[var(--surface-tertiary)]"}`} style={isGallery ? { background: imageBackground } : undefined}>
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            width={560}
            height={560}
            className="w-full h-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.025]"
          />
        ) : industry === "GENERAL" ? <GeneralProductPlaceholder /> : (
          <div className="relative grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_44%,#fff_0_9%,transparent_10%),linear-gradient(145deg,#f8f7f4,#e9e5df)]" aria-hidden="true">
            <span className="block w-[36%] aspect-square border-[clamp(9px,1.5vw,17px)] border-[#c49a4d] rounded-full -rotate-[18deg] shadow-[inset_0_0_0_4px_#f8dda1,0_18px_32px_rgba(75,52,19,0.2)]" />
            <span className="absolute top-[27%] right-[29%] text-white text-2xl drop-shadow-[0_0_14px_#fff]">✦</span>
          </div>
        )}
        <span className={`absolute top-2.5 max-w-[70%] truncate px-2 py-1 text-[0.62rem] ${isGallery ? "left-2.5 rounded-[4px] bg-white/90 text-slate-600 shadow-sm" : "right-2.5 border border-[var(--brand-accent)]/30 bg-white/90 text-[var(--brand-accent)]"}`}>{industry === "GOLD" ? (isGallery ? `${weight} گرم` : `طلای ${purity}`) : category}</span>
        {isGallery && <span className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-white/90 text-slate-500"><Heart size={15} /></span>}
        {isGallery && makingFee ? <span className="absolute bottom-2.5 right-2.5 rounded-[4px] bg-slate-100 px-2 py-1 text-[0.6rem] font-bold text-slate-600 shadow-sm">{makingFee.type === "PERCENT" ? <>اجرت {makingFee.value.toLocaleString("fa-IR")}٪{makingFee.value < 5 && " | کم‌اجرت"}</> : "اجرت ثابت"}</span> : isGallery && discountPercent !== undefined && discountPercent > 0 ? <span className="absolute bottom-2.5 right-2.5 rounded-[4px] bg-[var(--danger)] px-2 py-1 text-[0.6rem] font-bold text-[var(--danger-foreground)]">٪{discountPercent.toLocaleString("fa-IR")}</span> : null}
      </div>

      {/* Content */}
      <div className={`px-1 pb-4 sm:pb-5 ${isGallery ? "pt-2 text-right" : "px-2.5 pt-2.5 text-center sm:px-[15px] sm:pt-[17px]"}`}>
        {!isGallery && <span className="text-[0.7rem] text-[var(--muted)]">{industry === "GOLD" ? `${category} · ${weight} گرم` : category}</span>}
        <h3 className={`font-medium ${isGallery ? `mb-1 mt-0 line-clamp-2 h-10 overflow-hidden text-[0.76rem] leading-5 sm:text-[0.82rem] ${industry === "GENERAL" ? "text-slate-700" : ""}` : "mb-[7px] mt-[5px] min-h-8 text-[0.82rem] sm:text-[0.95rem]"}`}>{name}</h3>
        <div className={isGallery ? "grid min-h-9 grid-rows-[1rem_1.125rem] content-start justify-items-start gap-0.5" : ""}>
          {originalPrice ? <span className={`${isGallery ? "block" : "ml-2"} text-[0.7rem] text-slate-400 line-through`}>{originalPrice}</span> : isGallery ? <span aria-hidden="true" className="invisible block text-[0.7rem]">بدون تخفیف</span> : null}
          <strong className={`${isGallery ? "block text-[0.72rem]" : "text-[0.76rem] sm:text-[0.92rem]"} text-[var(--brand-primary)]`}>{price}</strong>
        </div>
      </div>
    </Link>
  );
}
