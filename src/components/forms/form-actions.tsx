"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export type FormActionsOrder = "submit-first" | "cancel-first";

type FormActionsProps = {
  pending: boolean;
  submitLabel: string;
  /** Disables submit (e.g. empty required name). */
  disableSubmit?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  /** submit-first: primary then secondary (e.g. event form). cancel-first: modal footer. */
  order?: FormActionsOrder;
  className?: string;
};

export function FormActions({
  pending,
  submitLabel,
  disableSubmit = false,
  onCancel,
  cancelLabel = "Cancel",
  order = "submit-first",
  className = "",
}: FormActionsProps) {
  const submitBtn = (
    <Button type="submit" disabled={pending || disableSubmit}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
      {submitLabel}
    </Button>
  );

  const cancelBtn =
    onCancel != null ? (
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={pending}
      >
        {cancelLabel}
      </Button>
    ) : null;

  const gap = order === "cancel-first" ? "justify-end gap-2" : "gap-3";

  return (
    <div className={`flex items-center pt-2 ${gap} ${className}`}>
      {order === "submit-first" ? (
        <>
          {submitBtn}
          {cancelBtn}
        </>
      ) : (
        <>
          {cancelBtn}
          {submitBtn}
        </>
      )}
    </div>
  );
}
