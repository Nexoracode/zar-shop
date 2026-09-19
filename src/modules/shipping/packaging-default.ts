import type { PrismaClient } from "@generated/prisma/client";
import { STANDARD_PACKAGING_BOX, STANDARD_PACKAGING_BOX_ID } from "@/modules/shipping/packaging";

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
  try {
    return await client.packagingBox.create({ data: { id: STANDARD_PACKAGING_BOX_ID, ...STANDARD_PACKAGING_BOX } });
  } catch (error) {
    // Concurrent checkouts all notice the missing default at once; whoever loses the race finds the row
    // the winner made (or the standard box, left un-flagged, and promotes it) instead of adding a second.
    if (!(typeof error === "object" && error && "code" in error && error.code === "P2002")) throw error;
    return client.packagingBox.update({ where: { id: STANDARD_PACKAGING_BOX_ID }, data: { isDefault: true, isActive: true } });
  }
}
