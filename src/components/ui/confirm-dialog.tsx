"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type ConfirmOptions = {
  title: string;
  message: string;
  /** Defaults to "Confirm". */
  confirmLabel?: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** "danger" (default) renders a red confirm button; "primary" the orange one. */
  tone?: "danger" | "primary";
};

/**
 * Accessible replacement for window.confirm(): focus-trapped modal, escape to
 * cancel, styled to match the app.
 *
 * const { confirm, confirmDialog } = useConfirm();
 * ...
 * if (!(await confirm({ title: "Delete file?", message: "…" }))) return;
 * ...
 * return <>{content}{confirmDialog}</>;
 */
export function useConfirm(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmDialog: ReactNode;
} {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Settle any dialog already open (treat as cancelled).
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const confirmDialog = options ? (
    <Modal isOpen onClose={() => settle(false)} title={options.title} size="sm">
      <div className="space-y-5">
        <p className="text-sm text-harley-text-muted">{options.message}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => settle(false)}>
            {options.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={options.tone === "primary" ? "primary" : "danger"}
            onClick={() => settle(true)}
          >
            {options.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  ) : null;

  return { confirm, confirmDialog };
}
