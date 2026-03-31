import type { VendorStatus } from "@/types/enums";

export type ModerationUiAction = "approve" | "request_changes" | "reject" | "suspend";

export function getStatusMeta(status: VendorStatus): {
  label: string;
  description: string;
  badgeClassName: string;
} {
  switch (status) {
    case "DRAFT":
      return {
        label: "Draft",
        description: "Application not yet submitted",
        badgeClassName: "border-stone-300 bg-stone-100 text-stone-800",
      };
    case "PENDING":
      return {
        label: "Awaiting review",
        description: "Submitted and waiting for moderator review",
        badgeClassName: "border-amber-300 bg-amber-50 text-amber-950",
      };
    case "CHANGES_REQUESTED":
      return {
        label: "Changes requested",
        description: "Vendor must update and resubmit",
        badgeClassName: "border-orange-300 bg-orange-50 text-orange-950",
      };
    case "APPROVED":
      return {
        label: "Approved",
        description: "Vendor is approved to sell",
        badgeClassName: "border-emerald-300 bg-emerald-50 text-emerald-950",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        description: "Application was rejected",
        badgeClassName: "border-red-300 bg-red-50 text-red-950",
      };
    case "SUSPENDED":
      return {
        label: "Suspended",
        description: "Vendor selling privileges suspended",
        badgeClassName: "border-red-900/40 bg-red-950 text-red-50",
      };
    default:
      return {
        label: String(status),
        description: "",
        badgeClassName: "border-stone-300 bg-stone-100 text-stone-800",
      };
  }
}

export function getAvailableModerationActions(status: VendorStatus): ModerationUiAction[] {
  switch (status) {
    case "PENDING":
      return ["approve", "request_changes", "reject"];
    case "CHANGES_REQUESTED":
      return ["approve", "reject"];
    case "APPROVED":
      return ["suspend"];
    case "REJECTED":
      return ["request_changes"];
    case "SUSPENDED":
      return ["approve"];
    case "DRAFT":
      return [];
    default:
      return [];
  }
}

export function requiresModerationReason(action: ModerationUiAction): boolean {
  return action !== "approve";
}

export function getModerationActionCopy(action: ModerationUiAction): {
  title: string;
  confirmMessage: string;
  notePlaceholder: string;
  submitLabel: string;
  variant: "primary" | "secondary" | "danger";
} {
  switch (action) {
    case "approve":
      return {
        title: "Approve vendor",
        confirmMessage: "Approve this vendor and allow marketplace access?",
        notePlaceholder: "Optional note for the audit trail",
        submitLabel: "Approve",
        variant: "primary",
      };
    case "request_changes":
      return {
        title: "Request changes",
        confirmMessage: "Explain what the vendor must fix before resubmitting.",
        notePlaceholder: "Required: what should the vendor change?",
        submitLabel: "Request changes",
        variant: "secondary",
      };
    case "reject":
      return {
        title: "Reject application",
        confirmMessage: "Explain why this application is rejected.",
        notePlaceholder: "Required: rejection reason",
        submitLabel: "Reject application",
        variant: "danger",
      };
    case "suspend":
      return {
        title: "Suspend vendor",
        confirmMessage: "Explain why this vendor is suspended.",
        notePlaceholder: "Required: suspension reason",
        submitLabel: "Suspend vendor",
        variant: "danger",
      };
    default:
      return {
        title: "Moderate",
        confirmMessage: "",
        notePlaceholder: "",
        submitLabel: "Submit",
        variant: "secondary",
      };
  }
}

export function formatModerationActionKey(action: string): string {
  switch (action) {
    case "APPROVE":
      return "Approved";
    case "REQUEST_CHANGES":
      return "Changes requested";
    case "REJECT":
      return "Rejected";
    case "SUSPEND":
      return "Suspended";
    default:
      return action;
  }
}
