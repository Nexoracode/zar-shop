import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

const galleryImageBackgrounds = [
  "bg-[linear-gradient(145deg,#fcfcfc,#f3f3f3)]",
  "bg-[linear-gradient(145deg,#f8f8f8,#ebebeb)]",
  "bg-[linear-gradient(145deg,#f3f3f3,#e2e2e2)]",
  "bg-[linear-gradient(145deg,#eeeeee,#d8d8d8)]",
] as const;

const generalImageBackgrounds = [
  "bg-[linear-gradient(145deg,#fff5f5,#ffe4e6)]",
  "bg-[linear-gradient(145deg,#eff6ff,#dbeafe)]",
  "bg-[linear-gradient(145deg,#fffbeb,#fef3c7)]",
  "bg-[linear-gradient(145deg,#ecfdf5,#d1fae5)]",
] as const;

function GeneralProductPlaceholder() {
  return <div className="h-full w-full bg-[#f1f2f4]" aria-hidden="true" />;
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
  storefrontVariant?: "default" | "gallery";
  imageTone?: number;
};

export function ProductCard({ href, name, category, industry, weight, purity, makingFee, discountPercent, price, originalPrice, image, storefrontVariant = "default", imageTone = 0 }: ProductCardProps) {
  const isGallery = storefrontVariant === "gallery";
  const imageBackground = industry === "GENERAL" ? generalImageBackgrounds[Math.abs(imageTone) % generalImageBackgrounds.length] : galleryImageBackgrounds[Math.abs(imageTone) % galleryImageBackgrounds.length];
  return (
    <Link
      className={`group min-w-0 bg-white transition-all duration-[250ms] ease-out ${isGallery ? "block" : "hover:-translate-y-[5px] hover:shadow-[0_18px_42px_rgba(23,35,59,0.09)]"}`}
      href={href}
    >
      {/* Media */}
      <div className={`relative overflow-hidden ${isGallery ? `aspect-square rounded-[7px] ${imageBackground}` : "aspect-[1/1.08] bg-[#f3f3f3]"}`}>
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
        {isGallery && <span className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-white/90 text-[#777]"><Heart size={15} /></span>}
        {isGallery && makingFee ? <span className="absolute bottom-2.5 right-2.5 rounded-[4px] bg-slate-100 px-2 py-1 text-[0.6rem] font-bold text-slate-600 shadow-sm">{makingFee.type === "PERCENT" ? <>اجرت {makingFee.value.toLocaleString("fa-IR")}٪{makingFee.value < 5 && " | کم‌اجرت"}</> : "اجرت ثابت"}</span> : isGallery && discountPercent !== undefined && discountPercent > 0 ? <span className="absolute bottom-2.5 right-2.5 rounded-[4px] bg-rose-600 px-2 py-1 text-[0.6rem] font-bold text-white">٪{discountPercent.toLocaleString("fa-IR")}</span> : null}
      </div>

      {/* Content */}
      <div className={`px-1 pb-4 sm:pb-5 ${isGallery ? "pt-2 text-right" : "px-2.5 pt-2.5 text-center sm:px-[15px] sm:pt-[17px]"}`}>
        {!isGallery && <span className="text-[0.7rem] text-[#747982]">{industry === "GOLD" ? `${category} · ${weight} گرم` : category}</span>}
        <h3 className={`font-medium ${isGallery ? `mb-1 mt-0 line-clamp-2 min-h-10 text-[0.76rem] leading-5 sm:text-[0.82rem] ${industry === "GENERAL" ? "text-slate-700" : ""}` : "mb-[7px] mt-[5px] min-h-8 text-[0.82rem] sm:text-[0.95rem]"}`}>{name}</h3>
        <div className={isGallery ? "flex min-h-9 flex-col items-start gap-0.5" : ""}>
          {originalPrice && <span className={`${isGallery ? "block" : "ml-2"} text-[0.7rem] text-slate-400 line-through`}>{originalPrice}</span>}
          <strong className={`${isGallery ? "block text-[0.72rem]" : "text-[0.76rem] sm:text-[0.92rem]"} text-[var(--brand-primary)]`}>{price}</strong>
        </div>
      </div>
    </Link>
  );
}
