import type { Prisma } from "@generated/prisma/client";

type AddressRow = Prisma.AddressGetPayload<{ include: { provinceRef: true; cityRef: true } }>;

export function serializeAddress(address: AddressRow) {
  return {
    id: address.id,
    title: address.title,
    recipientType: address.recipientType,
    recipient: address.recipient,
    phone: address.phone,
    provinceId: address.provinceId,
    province: address.provinceRef?.name ?? address.province,
    cityId: address.cityId,
    city: address.cityRef?.name ?? address.city,
    postalCode: address.postalCode,
    addressLine: address.addressLine,
    plaque: address.plaque,
    unit: address.unit,
    floor: address.floor,
    latitude: address.latitude === null ? null : Number(address.latitude),
    longitude: address.longitude === null ? null : Number(address.longitude),
    isDefault: address.isDefault,
    lastUsedAt: address.lastUsedAt?.toISOString() ?? null,
  };
}

export async function resolveLocation(transaction: Prisma.TransactionClient, provinceId: string, cityId: string) {
  const city = await transaction.city.findFirst({ where: { id: cityId, provinceId, isActive: true, province: { isActive: true } }, include: { province: true } });
  if (!city) return null;
  return { city, province: city.province };
}
