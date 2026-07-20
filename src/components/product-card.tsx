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
    <Link className="product-card" href={href}>
      <div className="product-card-media">
        {image ? (
          <Image src={image.src} alt={image.alt} width={560} height={560} />
        ) : (
          <div className="product-placeholder" aria-hidden="true">
            <span className="jewel-ring" />
            <span className="jewel-shine">✦</span>
          </div>
        )}
        <span className="product-purity">طلای {purity}</span>
      </div>
      <div className="product-card-content">
        <span className="product-category">{category} · {weight} گرم</span>
        <h3>{name}</h3>
        <strong>{price}</strong>
      </div>
    </Link>
  );
}
