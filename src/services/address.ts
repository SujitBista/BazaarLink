import { prisma } from "@/lib/db";
import type { CreateAddressInput } from "@/lib/validations/address";

function normalizeOptional(s: string | undefined): string | null | undefined {
  if (s === undefined) return undefined;
  const t = s.trim();
  return t.length ? t : null;
}

export async function listAddressesForUser(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  return prisma.address.create({
    data: {
      userId,
      label: normalizeOptional(input.label) ?? null,
      line1: input.line1.trim(),
      line2: normalizeOptional(input.line2) ?? null,
      city: input.city.trim(),
      state: normalizeOptional(input.state) ?? null,
      postalCode: input.postalCode.trim(),
      country: input.country.trim(),
    },
  });
}

export async function getAddressOwnedByUser(addressId: string, userId: string) {
  return prisma.address.findFirst({
    where: { id: addressId, userId },
  });
}
