"use client";

import { useEffect, type RefObject } from "react";

/** Keeps a native dialog open or closed in step with a flag; the browser traps focus and handles Esc. */
export function useDialogOpen(ref: RefObject<HTMLDialogElement | null>, isOpen: boolean): void {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [ref, isOpen]);
}
