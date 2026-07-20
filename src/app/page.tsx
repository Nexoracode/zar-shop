import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { getGoldPrice } from "@/modules/gold/gold-price.service";
import { calculateProductPrice } from "@/modules/products/pricing";
import type { Product } from "@generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [gold, products] = await Promise.all([
    getGoldPrice().catch(() => null),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 3 }).catch(() => []),
  ]);
  const price = gold ? Number(gold.pricePerGram18) : 48_500_000;
  return <main>
    <section className="container hero">
      <div><div className="eyebrow">طلا، به شفافیت ارزش واقعی‌اش</div><h1>زیبایی ماندگار،<br/>خریدی مطمئن.</h1><p>قیمت‌گذاری لحظه‌ای و شفاف، اصالت تضمین‌شده و فاکتور رسمی برای هر انتخاب ارزشمند شما.</p><div className="hero-actions"><Link className="btn btn-gold" href="/products">مشاهده مجموعه</Link><Link className="btn" href="#guide">چطور قیمت محاسبه می‌شود؟</Link></div></div>
      <div style={{position:"relative"}}><div className="hero-art"/><div className="price-pill"><small>هر گرم طلای ۱۸ عیار</small><strong>{formatMoney(price)}</strong></div></div>
    </section>
    <section className="section container"><div className="section-head"><div><span className="eyebrow">انتخاب‌های تازه</span><h2>محصولات ویژه</h2></div><Link href="/products">مشاهده همه ←</Link></div><div className="grid">
      {products.length ? products.map((product: Product) => { const calculated = calculateProductPrice({ goldPricePerGram18: price, weightGrams: Number(product.weightGrams), purity: product.purity, makingFeeType: product.makingFeeType, makingFeeValue: Number(product.makingFeeValue), profitPercent: Number(product.profitPercent), taxPercent: Number(product.taxPercent) }); return <Link href={`/products/${product.slug}`} className="card" key={product.id}><div className="product-image">طلای {product.purity}</div><div className="card-body"><span className="meta">{Number(product.weightGrams)} گرم</span><div className="product-row"><h3>{product.name}</h3><strong>{formatMoney(product.fixedPrice?.toString() ?? calculated.total)}</strong></div></div></Link>; }) : ["انگشتر طلای مینیمال","گردنبند ظریف","دستبند کلاسیک"].map((name,i)=><div className="card" key={name}><div className="product-image">نمونه {i+1}</div><div className="card-body"><span className="meta">به‌زودی</span><div className="product-row"><h3>{name}</h3></div></div></div>)}
    </div></section>
    <section id="guide" className="section container"><div className="section-head"><div><span className="eyebrow">قیمت‌گذاری قابل پیگیری</span><h2>هر عدد، دلیل روشنی دارد</h2></div></div><div className="stats"><div className="stat"><strong>۱</strong><span>نرخ لحظه‌ای طلای ۱۸ عیار</span></div><div className="stat"><strong>۲</strong><span>وزن و عیار دقیق محصول</span></div><div className="stat"><strong>۳</strong><span>اجرت ساخت و سود فروشنده</span></div><div className="stat"><strong>۴</strong><span>مالیات قانونی اجرت و سود</span></div></div></section>
  </main>;
}
