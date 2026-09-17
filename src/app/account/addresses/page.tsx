import { AccountAddressBook } from "@/components/account-address-book";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { serializeAddress } from "@/modules/account/addresses";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }], include: { provinceRef: true, cityRef: true } });
  return <AccountAddressBook initialAddresses={addresses.map(serializeAddress)} user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone }} />;
}
