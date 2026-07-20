import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import type { Prisma } from "@generated/prisma/client";
import Image from "next/image";

type ProductWithRelations = Prisma.ProductGetPayload<{ include: { category: true; media: { include: { media: true } } } }>;
export const dynamic = "force-dynamic";

export const metadata = { title: "محصولات" };
export default async function ProductsPage(){
  const [products,gold]=await Promise.all([db.product.findMany({where:{status:"ACTIVE"},include:{category:true,media:{include:{media:true},orderBy:{position:"asc"}}},orderBy:{createdAt:"desc"}}),getGoldPrice()]); const rate=Number(gold.pricePerGram18);
  return <main className="section container"><div className="section-head"><div><span className="eyebrow">مجموعه زر</span><h1>محصولات طلا</h1><p>قیمت‌ها بر اساس نرخ لحظه‌ای محاسبه شده‌اند.</p></div><div className="badge">نرخ: {formatMoney(rate)}</div></div><div className="grid">
    {products.map((p: ProductWithRelations)=>{const amount=p.fixedPrice?Number(p.fixedPrice):calculateProductPrice({goldPricePerGram18:rate,weightGrams:Number(p.weightGrams),purity:p.purity,makingFeeType:p.makingFeeType,makingFeeValue:Number(p.makingFeeValue),profitPercent:Number(p.profitPercent),taxPercent:Number(p.taxPercent)}).total;return <Link className="card" href={`/products/${p.slug}`} key={p.id}>{p.media[0]?.media.type==="IMAGE"?<Image className="product-image" style={{width:"100%",objectFit:"cover"}} width={500} height={260} src={p.media[0].media.url} alt={p.media[0].media.alt??p.name}/>:<div className="product-image">طلای {p.purity}</div>}<div className="card-body"><span className="meta">{p.category?.name??"طلا"} · {Number(p.weightGrams)} گرم</span><div className="product-row"><h3>{p.name}</h3><strong>{formatMoney(amount)}</strong></div></div></Link>})}
    {!products.length&&<div className="card empty" style={{gridColumn:"1/-1"}}>هنوز محصولی منتشر نشده است.</div>}
  </div></main>
}
