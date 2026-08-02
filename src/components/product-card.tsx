import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

type ProductCardProps = {
  href: string;
  name: string;
  category: string;
  industry: "GOLD" | "GENERAL";
  weight: number;
  purity: number;
  discountPercent?: number;
  price: string;
  originalPrice?: string;
  image?: { src: string; alt: string };
  storefrontVariant?: "default" | "gallery";
};

export function ProductCard({ href, name, category, industry, weight, purity, discountPercent, price, originalPrice, image, storefrontVariant = "default" }: ProductCardProps) {
  const isGallery = storefrontVariant === "gallery";
  return (
    <Link
      className={`group min-w-0 bg-white transition-all duration-[250ms] ease-out ${isGallery ? "block" : "hover:-translate-y-[5px] hover:shadow-[0_18px_42px_rgba(23,35,59,0.09)]"}`}
      href={href}
    >
      {/* Media */}
      <div className={`relative overflow-hidden bg-[#f3f3f3] ${isGallery ? "aspect-square rounded-[7px]" : "aspect-[1/1.08]"}`}>
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            width={560}
            height={560}
            className="w-full h-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.025]"
          />
        ) : (
          <div className="w-full h-full grid place-items-center relative bg-[radial-gradient(circle_at_50%_44%,#fff_0_9%,transparent_10%),linear-gradient(145deg,#f8f7f4,#e9e5df)]" aria-hidden="true">
            <span className="block w-[36%] aspect-square border-[clamp(9px,1.5vw,17px)] border-[#c49a4d] rounded-full -rotate-[18deg] shadow-[inset_0_0_0_4px_#f8dda1,0_18px_32px_rgba(75,52,19,0.2)]" />
            <span className="absolute top-[27%] right-[29%] text-white text-2xl drop-shadow-[0_0_14px_#fff]">✦</span>
          </div>
        )}
        <span className={`absolute top-2.5 bg-white/90 px-2 py-1 text-[0.62rem] ${isGallery ? "left-2.5 rounded-[4px] text-[#555]" : "right-2.5 border border-[var(--brand-accent)]/30 text-[var(--brand-accent)]"}`}>{industry === "GOLD" ? (isGallery ? `${weight} گرم` : `طلای ${purity}`) : "محصول فروشگاهی"}</span>
        {isGallery && <span className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-white/90 text-[#777]"><Heart size={15} /></span>}
        {isGallery && discountPercent !== undefined && discountPercent > 0 && <span className="absolute bottom-2.5 right-2.5 rounded-full bg-rose-600 px-2 py-1 text-[0.6rem] font-bold text-white">٪{discountPercent.toLocaleString("fa-IR")}</span>}
      </div>

      {/* Content */}
      <div className={`px-1 pb-4 sm:pb-5 ${isGallery ? "pt-2 text-right" : "px-2.5 pt-2.5 text-center sm:px-[15px] sm:pt-[17px]"}`}>
        {!isGallery && <span className="text-[#747982] text-[0.7rem]">{industry === "GOLD" ? `${category} · ${weight} گرم` : category}</span>}
        <h3 className={`font-medium ${isGallery ? "mb-0.5 mt-0 text-[0.76rem] leading-5 sm:text-[0.82rem]" : "mb-[7px] mt-[5px] min-h-8 text-[0.82rem] sm:text-[0.95rem]"}`}>{name}</h3>
        {originalPrice && <span className="ml-2 text-[0.7rem] text-slate-400 line-through">{originalPrice}</span>}
        <strong className={`${isGallery ? "text-[0.72rem]" : "text-[0.76rem] sm:text-[0.92rem]"} text-[var(--brand-primary)]`}>{price}</strong>
      </div>
    </Link>
  );
}
