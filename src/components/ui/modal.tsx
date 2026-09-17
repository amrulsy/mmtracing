"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  placement?: "center" | "bottom";
  size?: "sm" | "md" | "lg" | "xl";
}

let openDialogs = 0;
let previousOverflow = "";

export function Modal({ open, onClose, title, children, size = "md", placement = "center" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    if (openDialogs++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      dialog.close();
      if (--openDialogs === 0) document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [open]);

  const sizeClass = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
      className={cn("m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border border-surface-border bg-surface text-foreground p-0 backdrop:bg-black/60", sizeClass, placement === "bottom" && "mt-auto mb-0 w-full rounded-b-none pb-[env(safe-area-inset-bottom)]")}
    >
      {open && <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-border px-4 py-2 sm:px-6">
          <h2 id={titleId} className="text-base sm:text-lg font-bold">{title || "Dialog"}</h2>
          <button type="button" aria-label="Tutup dialog" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-hover">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </div>}
    </dialog>
  );
}
