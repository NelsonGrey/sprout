import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  /** Disables the confirm button — for a dialog whose action needs extra
   * input (e.g. a picker in `children`) before it's valid to submit. */
  confirmDisabled?: boolean;
  /** Optional extra content between the description and the action
   * buttons — e.g. a picker the confirmed action needs. */
  children?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 text-ink shadow-xl">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-2 text-sm text-ink-muted">{description}</Dialog.Description>}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button
              variant={destructive ? 'danger' : 'primary'}
              disabled={confirmDisabled}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
