import { z } from "zod";
import { db } from "@/lib/db";

const PROVINCES_URL = "https://api.tapin.ir/api/v4/location/public/all/province/filter/";
const CITIES_URL = "https://api.tapin.ir/api/v4/location/public/all/city/filter/";
const SOURCE_NAME = "TAPIN_PUBLIC_API";
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const provinceSchema = z.object({ pk: z.number().int().positive(), title: z.string().trim().min(1).max(120) });
const citySchema = z.object({ pk: z.number().int().positive(), title: z.string().trim().min(1).max(140), province_pk: z.number().int().positive(), province_title: z.string() });
const provincesResponseSchema = z.object({ returns: z.object({ status: z.number() }), entries: z.object({ province: z.array(provinceSchema) }) });
const citiesResponseSchema = z.object({ returns: z.object({ status: z.number() }), entries: z.object({ cities: z.array(citySchema) }) });
let synchronization: Promise<{ provinces: number; cities: number; syncedAt: Date }> | null = null;

function normalizePersian(value: string) {
  return value.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
}

function chunks<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

async function tapinRequest(url: string) {
  const response = await fetch(url, { method: "POST", cache: "no-store", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Tapin location API returned HTTP ${response.status}`);
  return response.json();
}

async function fetchSource() {
  const [provincePayload, cityPayload] = await Promise.all([tapinRequest(PROVINCES_URL), tapinRequest(CITIES_URL)]);
  const provinces = provincesResponseSchema.parse(provincePayload);
  const cities = citiesResponseSchema.parse(cityPayload);
  if (provinces.returns.status !== 20 || cities.returns.status !== 20 || provinces.entries.province.length !== 31 || cities.entries.cities.length < 2_000) throw new Error("Tapin location API returned incomplete data");
  return { provinces: provinces.entries.province, cities: cities.entries.cities };
}

async function performSync() {
  const source = await fetchSource();
  const syncedAt = new Date();
  for (const batch of chunks(source.provinces, 10)) {
    await Promise.all(batch.map((province) => db.province.upsert({
      where: { source_externalId: { source: SOURCE_NAME, externalId: province.pk } },
      create: { externalId: province.pk, name: normalizePersian(province.title), slug: `tapin-${province.pk}`, source: SOURCE_NAME, sourceUpdatedAt: syncedAt },
      update: { name: normalizePersian(province.title), slug: `tapin-${province.pk}`, latitude: null, longitude: null, source: SOURCE_NAME, sourceUpdatedAt: syncedAt, isActive: true },
    })));
  }
  const storedProvinces = await db.province.findMany({ where: { source: SOURCE_NAME, externalId: { in: source.provinces.map((item) => item.pk) } }, select: { id: true, externalId: true } });
  const provinceIds = new Map(storedProvinces.map((province) => [province.externalId, province.id]));
  const cities = source.cities.flatMap((city) => {
    const provinceId = provinceIds.get(city.province_pk);
    return provinceId ? [{ ...city, provinceId }] : [];
  });
  if (cities.length !== source.cities.length) throw new Error("Tapin returned a city with an unknown province");
  for (const batch of chunks(cities, 10)) {
    await Promise.all(batch.map((city) => db.city.upsert({
      where: { source_externalId: { source: SOURCE_NAME, externalId: city.pk } },
      create: { externalId: city.pk, provinceId: city.provinceId, name: normalizePersian(city.title), slug: `tapin-${city.pk}`, source: SOURCE_NAME, sourceUpdatedAt: syncedAt },
      update: { provinceId: city.provinceId, name: normalizePersian(city.title), slug: `tapin-${city.pk}`, latitude: null, longitude: null, source: SOURCE_NAME, sourceUpdatedAt: syncedAt, isActive: true },
    })));
  }
  await Promise.all([
    db.province.updateMany({ where: { OR: [{ source: { not: SOURCE_NAME } }, { source: SOURCE_NAME, externalId: { notIn: source.provinces.map((item) => item.pk) } }] }, data: { isActive: false } }),
    db.city.updateMany({ where: { OR: [{ source: { not: SOURCE_NAME } }, { source: SOURCE_NAME, externalId: { notIn: source.cities.map((item) => item.pk) } }] }, data: { isActive: false } }),
  ]);
  return { provinces: source.provinces.length, cities: source.cities.length, syncedAt };
}

export async function syncIranLocations(force = false) {
  if (!force) {
    const latest = await db.province.findFirst({ where: { isActive: true, source: SOURCE_NAME }, orderBy: { sourceUpdatedAt: "desc" }, select: { sourceUpdatedAt: true } });
    if (latest && Date.now() - latest.sourceUpdatedAt.getTime() < REFRESH_INTERVAL_MS) {
      const [provinces, cities] = await Promise.all([db.province.count({ where: { isActive: true } }), db.city.count({ where: { isActive: true } })]);
      if (provinces === 31 && cities >= 2_000) return { provinces, cities, syncedAt: latest.sourceUpdatedAt };
    }
  }
  synchronization ??= performSync().finally(() => { synchronization = null; });
  return synchronization;
}

export async function ensureIranLocations() {
  try { return await syncIranLocations(false); }
  catch (error) {
    const [provinces, cities, latest] = await Promise.all([
      db.province.count({ where: { isActive: true } }), db.city.count({ where: { isActive: true } }),
      db.province.findFirst({ where: { isActive: true }, orderBy: { sourceUpdatedAt: "desc" }, select: { sourceUpdatedAt: true } }),
    ]);
    if (provinces === 31 && cities >= 2_000 && latest) return { provinces, cities, syncedAt: latest.sourceUpdatedAt };
    throw error;
  }
}

export const iranLocationSource = { name: SOURCE_NAME, url: PROVINCES_URL } as const;
