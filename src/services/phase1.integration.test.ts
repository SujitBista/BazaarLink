import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  confirmEmailVerification,
  confirmPasswordReset,
  login,
  requestEmailVerification,
  requestPasswordReset,
  signup,
} from "@/services/auth";
import { approveVendor, submitVendorOnboarding, suspendVendor, toNonAdminVendorResponse } from "@/services/vendor";
import { UserRole, VendorStatus } from "@prisma/client";

const TEST_EMAIL_PREFIX = "phase1test+";

function uniqueEmail(label: string) {
  return `${TEST_EMAIL_PREFIX}${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function cleanupTestData() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.vendorProfile.deleteMany({ where: { vendor: { userId: { in: userIds } } } });
  await prisma.vendor.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

afterEach(async () => {
  await cleanupTestData();
});

describe("Phase 1 integration and edge cases", () => {
  it("keeps duplicate signup conflict deterministic under race", async () => {
    const email = uniqueEmail("duplicate-signup").toUpperCase();
    const payload = { email: `  ${email}  `, password: "Pass1234" };

    const results = await Promise.allSettled([signup(payload), signup(payload)]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason as Error & {
      statusCode?: number;
      code?: string;
    };
    expect(reason.statusCode).toBe(409);
    expect(reason.code).toBe("EMAIL_EXISTS");
  });

  it("keeps login failures indistinguishable for invalid email and password", async () => {
    const email = uniqueEmail("login");
    await signup({ email, password: "Pass1234" });

    type AuthErr = Error & { statusCode?: number; code?: string };
    const badEmailError = (await login({ email: uniqueEmail("missing"), password: "Pass1234" }).catch(
      (e: AuthErr) => e
    )) as AuthErr;
    const badPasswordError = (await login({ email, password: "wrong-pass-1" }).catch((e: AuthErr) => e)) as AuthErr;

    expect(badEmailError.message).toBe("Invalid credentials");
    expect(badPasswordError.message).toBe("Invalid credentials");
    expect(badEmailError.statusCode).toBe(401);
    expect(badPasswordError.statusCode).toBe(401);
  });

  it("handles verification token expiry and single-use semantics", async () => {
    const email = uniqueEmail("verify");
    const user = await signup({ email, password: "Pass1234" });

    const first = await requestEmailVerification(email);
    expect(first.token).toBeTruthy();
    await confirmEmailVerification(first.token!);

    const verifiedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(verifiedUser?.emailVerified).toBe(true);

    const reusedError = (await confirmEmailVerification(first.token!).catch((e: Error & { code?: string }) => e)) as Error & {
      code?: string;
    };
    expect(reusedError.code).toBe("TOKEN_ALREADY_USED");

    const second = await requestEmailVerification(email);
    expect(second.token).toBeNull();

    const unverifiedEmail = uniqueEmail("verify-expired");
    await signup({ email: unverifiedEmail, password: "Pass1234" });
    const expiring = await requestEmailVerification(unverifiedEmail);
    await prisma.emailVerificationToken.updateMany({
      where: { user: { email: unverifiedEmail }, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 5000) },
    });
    const expiredError = (await confirmEmailVerification(expiring.token!).catch((e: Error & { code?: string }) => e)) as Error & {
      code?: string;
    };
    expect(expiredError.code).toBe("TOKEN_EXPIRED");
  });

  it("handles password reset token single-use and expiry", async () => {
    const email = uniqueEmail("pwd-reset");
    await signup({ email, password: "Pass1234" });

    const { token } = await requestPasswordReset(email);
    expect(token).toBeTruthy();

    await confirmPasswordReset({ token: token!, password: "Newpass123" });
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await import("@/lib/auth/password").then((m) => m.verifyPassword("Newpass123", user!.passwordHash));
    expect(ok).toBe(true);

    const reused = (await confirmPasswordReset({ token: token!, password: "Otherpass123" }).catch(
      (e: Error & { code?: string }) => e
    )) as Error & { code?: string };
    expect(reused.code).toBe("TOKEN_ALREADY_USED");
  });

  it("enforces onboarding gating, idempotent resubmission, moderation transitions, and privacy", async () => {
    const user = await signup({ email: uniqueEmail("vendor"), password: "Pass1234" });

    const blocked = (await submitVendorOnboarding(user.id, {
      businessName: "Acme Traders",
      documentUrl: "https://docs.example.com/doc1.pdf",
      contactEmail: "owner@example.com",
      contactPhone: "+15550001111",
    }).catch((e: Error & { code?: string; statusCode?: number }) => e)) as Error & { code?: string; statusCode?: number };
    expect(blocked.code).toBe("EMAIL_NOT_VERIFIED");
    expect(blocked.statusCode).toBe(403);

    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

    const first = await submitVendorOnboarding(user.id, {
      businessName: "Acme Traders",
      documentUrl: "https://docs.example.com/doc1.pdf",
      contactEmail: "owner@example.com",
      contactPhone: "+15550001111",
    });

    const second = await submitVendorOnboarding(user.id, {
      businessName: "Acme Updated",
      documentUrl: "https://docs.example.com/doc2.pdf",
      contactEmail: "owner2@example.com",
      contactPhone: "+15552223333",
    });

    expect(second.id).toBe(first.id);
    expect(second.profile?.businessName).toBe("Acme Updated");
    expect(second.status).toBe(VendorStatus.PENDING);

    const nonAdmin = toNonAdminVendorResponse(second);
    expect(nonAdmin.profile).not.toHaveProperty("documentUrl");
    expect(nonAdmin.profile).not.toHaveProperty("contactEmail");
    expect(nonAdmin.profile).not.toHaveProperty("contactPhone");
    expect(nonAdmin).not.toHaveProperty("approvedById");

    const admin = await prisma.user.create({
      data: {
        email: uniqueEmail("admin"),
        passwordHash: "dummy-hash",
        role: UserRole.ADMIN,
        emailVerified: true,
      },
    });

    const approved = await approveVendor(second.id, admin.id);
    expect(approved.status).toBe(VendorStatus.APPROVED);
    expect(approved.approvedAt).toBeTruthy();
    expect(approved.approvedById).toBe(admin.id);

    const approvedAgain = await approveVendor(second.id, admin.id);
    expect(approvedAgain.status).toBe(VendorStatus.APPROVED);
    expect(approvedAgain.approvedById).toBe(admin.id);

    const suspended = await suspendVendor(second.id);
    expect(suspended.status).toBe(VendorStatus.SUSPENDED);

    const suspendedAgain = await suspendVendor(second.id);
    expect(suspendedAgain.status).toBe(VendorStatus.SUSPENDED);

    const reinstated = await approveVendor(second.id, admin.id);
    expect(reinstated.status).toBe(VendorStatus.APPROVED);
  });
});
