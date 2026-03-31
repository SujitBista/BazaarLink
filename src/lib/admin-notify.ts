/**
 * Operational hooks for notifying operators. No SMTP in MVP — structured logs;
 * wire Resend/SendGrid later using the same entry points.
 */

export type SignupIntent = "vendor" | "customer";

export function notifyAdminSignupPendingVerification(
  email: string,
  opts: { verificationUrl: string; intent?: SignupIntent }
): void {
  const role = opts.intent === "vendor" ? "Vendor signup" : "New signup";
  const line = `[BazaarLink admin] ${role} — email pending verification: ${email} | User must open: ${opts.verificationUrl} | Review applications: /admin/vendors`;
  console.info(line);
}

export function notifyAdminVendorApplicationSubmitted(opts: {
  vendorId: string;
  accountEmail: string;
  businessName: string;
}): void {
  const line = `[BazaarLink admin] Vendor application submitted — vendorId=${opts.vendorId} account=${opts.accountEmail} business="${opts.businessName}" | Review: /admin/vendors/${opts.vendorId}`;
  console.info(line);
}
