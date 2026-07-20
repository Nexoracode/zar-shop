import { db } from "@/lib/db";
import { MediaUploader } from "@/components/media-uploader";
import type { MediaAsset } from "@generated/prisma/client";
import Image from "next/image";
export default async function MediaPage(){const items=await db.mediaAsset.findMany({orderBy:{createdAt:"desc"},take:100});return <><div className="panel-head"><div><h1>گالری رسانه</h1><span className="meta">کتابخانه مشترک تصاویر و ویدیوهای محصولات</span></div></div><MediaUploader/><div className="media-grid" style={{marginTop:24}}>{items.map((item: MediaAsset)=><div className="media-item" key={item.id}>{item.type==="IMAGE"?<Image src={item.url} alt={item.alt??item.title??"رسانه"} width={320} height={140}/>:<video src={item.url} controls/>}<div className="card-body"><small>{item.title??item.storageKey}</small></div></div>)}</div>{!items.length&&<div className="empty">گالری هنوز خالی است.</div>}</>}
