import { AlertDialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Button } from "./button";
import { overlaySurfaceClass } from "./overlay";

export interface ConfirmDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The control that opens the dialog (rendered with `asChild`). Omit when `open` is controlled. */
  trigger?: ReactNode;
  /** The question, naming the object: "Delete “Paint the ceiling” and its 3 subtasks?" (spec E01). */
  title: ReactNode;
  /** What will happen, when the title does not say it all. */
  description?: ReactNode;
  /** A verb and the object: "Delete task" (task rules), never "OK". */
  confirmLabel: string;
  /** danger for a loss (delete); primary when nothing is destroyed (completing, decision I2). */
  confirmVariant?: "danger" | "primary";
  /** Shown on the confirm button while `pending`, e.g. "Deleting…". */
  pendingLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** The request is running: the confirm button shows it and the dialog cannot be closed. */
  pending?: boolean;
  /** Why the action failed; the dialog stays open so the user can retry or cancel. */
  error?: ReactNode;
  /**
   * Where focus goes on close. Without a `trigger` (the dialog opened from a menu item) the app
   * moves focus itself, e.g. back to the menu button; call `event.preventDefault()` first.
   */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Asks before an action that cannot be undone, e.g. deleting a task (spec E01). Focus starts on
 * Cancel, is trapped inside and returns to the trigger on close (WAI-ARIA APG, alert dialog).
 */
export function ConfirmDialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  pendingLabel,
  cancelLabel = "Cancel",
  onConfirm,
  pending = false,
  error,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  return (
    // While pending, Escape is cancelled below and Cancel is disabled; an alert dialog does not
    // close on an outside click, so nothing else can close it.
    <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="confirm-dialog-overlay"
          className="fixed inset-0 bg-scrim"
        />
        <DialogPrimitive.Content
          data-slot="confirm-dialog"
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            overlaySurfaceClass,
            "fixed inset-x-page-gutter top-1/2 mx-auto flex max-w-measure -translate-y-1/2 flex-col gap-between-groups p-inset",
          )}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <div className="flex flex-col gap-group">
            <DialogPrimitive.Title className="font-strong">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-group wide:flex-row">
            <Button variant={confirmVariant} loading={pending} onClick={onConfirm}>
              {pending && pendingLabel ? pendingLabel : confirmLabel}
            </Button>
            <DialogPrimitive.Cancel asChild>
              <Button disabled={pending}>{cancelLabel}</Button>
            </DialogPrimitive.Cancel>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
