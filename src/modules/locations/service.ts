import { z } from "zod";
import { db } from "@/lib/db";

const SOURCE_URL = "https://raw.githubusercontent.com/masterking32/iran-states-cities-districts/master/data_states_all_in_one.json";
const SOURCE_NAME = "IRAN_POST_GITHUB";
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const sourceItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140),
  coordinates: z.tuple([z.number(), z.number()]),
  type: z.enum(["province", "county", "city"]),
  province: z.number().int().nonnegative(),
});

const sourceSchema = z.array(sourceItemSchema);
let synchronization: Promise<{ provinces: number; cities: number; syncedAt: Date }> | null = null;

function normalizePersian(value: string) {
  return value.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
}

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

async function fetchSource() {
  const response = await fetch(SOURCE_URL, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Iran location source returned HTTP ${response.status}`);
  const items = sourceSchema.parse(await response.json());
  const provinces = items.filter((item) => item.type === "province");
  const cities = items.filter((item) => item.type === "city");
  if (provinces.length !== 31 || cities.length < 1_000) throw new Error("Iran location source is incomplete");
  return { provinces, cities };
}

async function performSync() {
  const source = await fetchSource();
  const syncedAt = new Date();
  for (const batch of chunks(source.provinces, 10)) {
    await Promise.all(batch.map((province) => db.province.upsert({
      where: { externalId: province.id },
      create: { externalId: province.id, name: normalizePersian(province.name), slug: province.slug, longitude: province.coordinates[0], latitude: province.coordinates[1], source: SOURCE_NAME, sourceUpdatedAt: syncedAt },
      update: { name: normalizePersian(province.name), slug: province.slug, longitude: province.coordinates[0], latitude: province.coordinates[1], source: SOURCE_NAME, sourceUpdatedAt: syncedAt, isActive: true },
    })));
  }
  const storedProvinces = await db.province.findMany({ where: { externalId: { in: source.provinces.map((item) => item.id) } }, select: { id: true, externalId: true } });
  const provinceIds = new Map(storedProvinces.map((province) => [province.externalId, province.id]));
  const cities = source.cities.flatMap((city) => {
    const provinceId = provinceIds.get(city.province);
    return provinceId ? [{ ...city, provinceId }] : [];
  });
  if (cities.length !== source.cities.length) throw new Error("Some cities reference an unknown province");
  for (const batch of chunks(cities, 10)) {
    await Promise.all(batch.map((city) => db.city.upsert({
      where: { externalId: city.id },
      create: { externalId: city.id, provinceId: city.provinceId, name: normalizePersian(city.name), slug: city.slug, longitude: city.coordinates[0], latitude: city.coordinates[1], source: SOURCE_NAME, sourceUpdatedAt: syncedAt },
      update: { provinceId: city.provinceId, name: normalizePersian(city.name), slug: city.slug, longitude: city.coordinates[0], latitude: city.coordinates[1], source: SOURCE_NAME, sourceUpdatedAt: syncedAt, isActive: true },
    })));
  }
  await Promise.all([
    db.province.updateMany({ where: { externalId: { notIn: source.provinces.map((item) => item.id) } }, data: { isActive: false } }),
    db.city.updateMany({ where: { externalId: { notIn: source.cities.map((item) => item.id) } }, data: { isActive: false } }),
  ]);
  return { provinces: source.provinces.length, cities: source.cities.length, syncedAt };
}

export async function syncIranLocations(force = false) {
  if (!force) {
    const latest = await db.province.findFirst({ where: { isActive: true }, orderBy: { sourceUpdatedAt: "desc" }, select: { sourceUpdatedAt: true } });
    if (latest && Date.now() - latest.sourceUpdatedAt.getTime() < REFRESH_INTERVAL_MS) {
      const [provinces, cities] = await Promise.all([db.province.count({ where: { isActive: true } }), db.city.count({ where: { isActive: true } })]);
      if (provinces === 31 && cities >= 1_000) return { provinces, cities, syncedAt: latest.sourceUpdatedAt };
    }
  }
  synchronization ??= performSync().finally(() => { synchronization = null; });
  return synchronization;
}

export async function ensureIranLocations() {
  try {
    return await syncIranLocations(false);
  } catch (error) {
    const [provinces, cities, latest] = await Promise.all([
      db.province.count({ where: { isActive: true } }),
      db.city.count({ where: { isActive: true } }),
      db.province.findFirst({ where: { isActive: true }, orderBy: { sourceUpdatedAt: "desc" }, select: { sourceUpdatedAt: true } }),
    ]);
    if (provinces === 31 && cities >= 1_000 && latest) return { provinces, cities, syncedAt: latest.sourceUpdatedAt };
    throw error;
  }
}

export const iranLocationSource = { name: SOURCE_NAME, url: SOURCE_URL } as const;
