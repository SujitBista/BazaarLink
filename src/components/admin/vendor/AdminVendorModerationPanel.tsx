"use client";

import { useCallback, useState } from "react";
import { fetchApiJson, formatValidationDetails } from "@/lib/client/api-json";
import { AdminActionConfirmDialog } from "@/components/admin/vendor/AdminActionConfirmDialog";
import {
  getAvailableModerationActions,
  getModerationActionCopy,
  getStatusMeta,
  requiresModerationReason,
  type ModerationUiAction,
} from "@/lib/admin/vendor-moderation";
import type { VendorStatus } from "@/types/enums";

const actionButtonClass = (action: ModerationUiAction): string => {
  const base =
    "rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  switch (action) {
    case "approve":
      return `${base} bg-orange-600 text-white hover:bg-orange-700`;
    case "request_changes":
      return `${base} border border-stone-300 bg-white text-stone-900 hover:bg-stone-50`;
    case "reject":
    case "suspend":
      return `${base} border border-red-200 bg-red-50 text-red-900 hover:bg-red-100`;
    default:
      return `${base} border border-stone-300 bg-white`;
  }
};

export function AdminVendorModerationPanel({
  vendorId,
  status,
  rejectionReason,
  onModerated,
}: {
  vendorId: string;
  status: VendorStatus;
  rejectionReason: string | null;
  onModerated: () => void;
}) {
  const actions = getAvailableModerationActions(status);
  const statusMeta = getStatusMeta(status);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ModerationUiAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const confirmCopy = pendingAction ? getModerationActionCopy(pendingAction) : null;

  const openConfirm = (action: ModerationUiAction) => {
    if (requiresModerationReason(action) && !note.trim()) {
      setNoteError("A note is required for this action.");
      return;
    }
    setNoteError(null);
    setPendingAction(action);
  };

  const closeConfirm = () => {
    if (busy) return;
    setPendingAction(null);
  };

  const execute = useCallback(async () => {
    if (!pendingAction) return;
    setBusy(true);
    setBanner(null);
    setNoteError(null);

    const path = `/api/admin/vendors/${encodeURIComponent(vendorId)}`;
    let url = "";
    let body: Record<string, unknown> = {};

    switch (pendingAction) {
      case "approve":
        url = `${path}/approve`;
        body = { note: note.trim() ? note.trim() : undefined };
        break;
      case "request_changes":
        url = `${path}/request-changes`;
        body = { note: note.trim() };
        break;
      case "reject":
        url = `${path}/reject`;
        body = { note: note.trim() };
        break;
      case "suspend":
        url = `${path}/suspend`;
        body = { rejectionReason: note.trim() };
        break;
      default:
        setBusy(false);
        return;
    }

    const res = await fetchApiJson<{ vendor: unknown }>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setBusy(false);
    if (!res.ok) {
      const details = res.details ? formatValidationDetails(res.details) : [];
      setBanner({
        type: "err",
        text: [res.error, ...details].filter(Boolean).join(" · "),
      });
      setPendingAction(null);
      return;
    }
    setBanner({ type: "ok", text: "Action completed successfully." });
    setPendingAction(null);
    setNote("");
    onModerated();
  }, [pendingAction, vendorId, note, onModerated]);

  return (
    <aside className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
      <h2 className="text-lg font-semibold text-stone-900">Moderation</h2>
      <p className="mt-1 text-sm text-stone-600">{statusMeta.description}</p>

      {rejectionReason ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Latest feedback to vendor</p>
          <p className="mt-1 whitespace-pre-wrap">{rejectionReason}</p>
        </div>
      ) : null}

      {banner ? (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            banner.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      {actions.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No moderation actions are available for this status.</p>
      ) : (
        <>
          <label htmlFor="mod-note" className="mt-6 block text-xs font-medium uppercase tracking-wide text-stone-500">
            Moderation note
          </label>
          <p className="mt-1 text-xs text-stone-500">Select an action and include a note when required.</p>
          <textarea
            id="mod-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteError(null);
            }}
            rows={4}
            className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Notes are required for request changes, reject, and suspend."
          />
          {noteError ? <p className="mt-1 text-sm text-red-800">{noteError}</p> : null}

          <div className="mt-4 flex flex-col gap-2">
            {actions.includes("approve") ? (
              <button type="button" className={actionButtonClass("approve")} onClick={() => openConfirm("approve")}>
                Approve
              </button>
            ) : null}
            {actions.includes("request_changes") ? (
              <button
                type="button"
                className={actionButtonClass("request_changes")}
                onClick={() => openConfirm("request_changes")}
              >
                Request changes
              </button>
            ) : null}
            {actions.includes("reject") ? (
              <button type="button" className={actionButtonClass("reject")} onClick={() => openConfirm("reject")}>
                Reject
              </button>
            ) : null}
            {actions.includes("suspend") ? (
              <button type="button" className={actionButtonClass("suspend")} onClick={() => openConfirm("suspend")}>
                Suspend
              </button>
            ) : null}
          </div>
        </>
      )}

      {confirmCopy ? (
        <AdminActionConfirmDialog
          open={!!pendingAction}
          title={confirmCopy.title}
          message={confirmCopy.confirmMessage}
          confirmLabel={confirmCopy.submitLabel}
          confirmVariant={confirmCopy.variant === "danger" ? "danger" : confirmCopy.variant === "primary" ? "primary" : "secondary"}
          busy={busy}
          onClose={closeConfirm}
          onConfirm={() => void execute()}
        />
      ) : null}
    </aside>
  );
}
