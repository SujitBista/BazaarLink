"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function AdminActionConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  busy = false,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "bg-red-700 text-white hover:bg-red-800"
      : confirmVariant === "secondary"
        ? "border border-stone-300 bg-white text-stone-900 hover:bg-stone-50"
        : "bg-orange-600 text-white hover:bg-orange-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl"
      >
        <h2 id="admin-confirm-title" className="text-lg font-semibold text-stone-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-stone-600">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${confirmClass}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
