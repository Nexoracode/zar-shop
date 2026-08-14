import { AccountPageHeader } from "@/components/account-page-ui";
import { AccountAddressBook } from "@/components/account-address-book";
import { db } from "@/lib/db";
import { requireUser } from "@/modules/auth/session";
import { serializeAddress } from "@/modules/account/addresses";

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }], include: { provinceRef: true, cityRef: true } });
  return <><AccountPageHeader title="نشانی‌های من" description="نشانی‌های تحویل برای خودتان یا دیگران" /><AccountAddressBook initialAddresses={addresses.map(serializeAddress)} user={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone }} /></>;
}
