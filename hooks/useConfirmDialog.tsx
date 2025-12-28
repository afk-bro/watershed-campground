/**
 * useConfirmDialog Hook
 *
 * Provides a declarative API for confirmation dialogs, replacing
 * native confirm() calls with accessible, styled ConfirmDialog component.
 *
 * @example
 * ```tsx
 * const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await showConfirm({
 *     title: "Delete Item",
 *     message: "Are you sure you want to delete this item?",
 *     variant: "danger"
 *   });
 *
 *   if (!confirmed) return;
 *   // ... proceed with deletion
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     {ConfirmDialogComponent}
 *   </>
 * );
 * ```
 */

import { useState, useCallback } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    variant: "info",
    resolve: null
  });

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        ...options,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const ConfirmDialogComponent = (
    <ConfirmDialog
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
    />
  );

  return {
    showConfirm,
    ConfirmDialogComponent
  };
}
