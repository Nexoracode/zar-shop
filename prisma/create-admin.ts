import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

/**
 * ساخت یک‌بارمصرف اولین حساب مدیر روی دیتابیس واقعی (production)، مستقل از seed توسعه که
 * فقط با NODE_ENV=development و روی دیتابیس محلی اجرا می‌شود و کل کاتالوگ نمونه را هم می‌سازد.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} در فایل .env تنظیم نشده است.`);
  return value;
}

async function main() {
  const email = requireEnv("ADMIN_EMAIL");
  const phone = requireEnv("ADMIN_PHONE");
  const password = requireEnv("ADMIN_PASSWORD");

  const db = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: process.env.DATABASE_HOST ?? "127.0.0.1",
      port: Number(process.env.DATABASE_PORT ?? 3306),
      user: process.env.DATABASE_USER ?? "root",
      password: process.env.DATABASE_PASSWORD ?? "",
      database: process.env.DATABASE_NAME ?? "store_db",
      connectionLimit: 2,
    }),
  });

  const existingAdmin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log(`یک حساب مدیر از قبل وجود دارد (${existingAdmin.email}). برای جلوگیری از تغییر ناخواسته، این اسکریپت کاری انجام نداد.`);
    await db.$disconnect();
    return;
  }

  const admin = await db.user.create({
    data: {
      email,
      phone,
      firstName: "مدیر",
      lastName: "فروشگاه",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: await hash(password, 12),
    },
  });

  console.log(`حساب مدیر ساخته شد: ${admin.email} / ${admin.phone}`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
