import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({ host: process.env.DATABASE_HOST??"127.0.0.1", port:Number(process.env.DATABASE_PORT??3306), user:process.env.DATABASE_USER??"root", password:process.env.DATABASE_PASSWORD??"", database:process.env.DATABASE_NAME??"zar_store", connectionLimit:2 });
const db=new PrismaClient({adapter});
async function main(){const email=process.env.ADMIN_EMAIL??"admin@example.com";await db.user.upsert({where:{email},update:{role:"ADMIN",status:"ACTIVE"},create:{email,firstName:"مدیر",lastName:"فروشگاه",role:"ADMIN",passwordHash:await hash(process.env.ADMIN_PASSWORD??"ChangeMe123!",12)}});const category=await db.category.upsert({where:{slug:"rings"},update:{},create:{name:"انگشتر",slug:"rings"}});await db.product.upsert({where:{sku:"ZAR-DEMO-001"},update:{},create:{sku:"ZAR-DEMO-001",name:"انگشتر طلای مینیمال",slug:"minimal-gold-ring",description:"نمونه محصول اولیه فروشگاه",status:"ACTIVE",categoryId:category.id,purity:750,weightGrams:"2.850",makingFeeType:"PERCENT",makingFeeValue:"12",profitPercent:"7",taxPercent:"10",stock:3,featured:true}});await db.goldPrice.create({data:{pricePerGram18:"48500000",source:"seed",fetchedAt:new Date()}})}
main().finally(()=>db.$disconnect());
