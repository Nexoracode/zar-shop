import type { PrismaClient } from "@generated/prisma/client";
import { STANDARD_PACKAGING_BOX } from "@/modules/shipping/packaging";

type BoxClient = Pick<PrismaClient, "packagingBox">;

/**
 * Makes sure a usable default box exists, and returns it.
 *
 * The admin API refuses every change that would remove the default, so this only ever acts on a
 * database that got there some other way — restored from a backup, seeded by hand. A default that
 * was merely switched off is switched back on; only when there is none at all is a new one made.
 */
export async function ensureDefaultPackagingBox(client: BoxClient) {
  const active = await client.packagingBox.findFirst({ where: { isDefault: true, isActive: true } });
  if (active) return active;
  const inactive = await client.packagingBox.findFirst({ where: { isDefault: true } });
  if (inactive) return client.packagingBox.update({ where: { id: inactive.id }, data: { isActive: true } });
  return client.packagingBox.create({ data: { ...STANDARD_PACKAGING_BOX } });
}
