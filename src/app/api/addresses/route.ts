import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createAddress, listAddressesForUser } from "@/services/address";
import { createAddressSchema } from "@/lib/validations/address";
import { fromServiceError, parseJsonBody, validationError } from "@/lib/api/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const addresses = await listAddressesForUser(user.id);
    return NextResponse.json({ addresses });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to list addresses", code: "LIST_ADDRESSES_FAILED" });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = createAddressSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return validationError(parsed.error.flatten());
    }
    const address = await createAddress(user.id, parsed.data);
    return NextResponse.json({ address });
  } catch (e) {
    return fromServiceError(e, { error: "Failed to create address", code: "CREATE_ADDRESS_FAILED" });
  }
}
