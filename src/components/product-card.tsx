import Image from "next/image";
import Link from "next/link";

type ProductCardProps = {
  href: string;
  name: string;
  category: string;
  weight: number;
  purity: number;
  price: string;
  image?: { src: string; alt: string };
};

export function ProductCard({ href, name, category, weight, purity, price, image }: ProductCardProps) {
  return (
    <Link
      className="group min-w-0 bg-white transition-all duration-[250ms] ease-out hover:-translate-y-[5px] hover:shadow-[0_18px_42px_rgba(23,35,59,0.09)]"
      href={href}
    >
      {/* Media */}
      <div className="aspect-[1/1.08] relative overflow-hidden bg-[#f9f9f8]">
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
        <span className="absolute top-3 right-3 px-2 py-1 text-[#785b27] bg-white/90 border border-[#efe5d1] text-[0.68rem]">
          طلای {purity}
        </span>
      </div>

      {/* Content */}
      <div className="px-[15px] pt-[17px] pb-5 text-center">
        <span className="text-[#747982] text-[0.74rem]">{category} · {weight} گرم</span>
        <h3 className="min-h-8 mt-[5px] mb-[7px] text-[0.95rem] font-medium">{name}</h3>
        <strong className="text-[#1c3155] text-[0.92rem]">{price}</strong>
      </div>
    </Link>
  );
}
