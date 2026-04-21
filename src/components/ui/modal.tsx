"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div
        ref={ref}
        className={cn(
          "relative z-10 w-full glass-panel p-0 overflow-hidden animate-in zoom-in-95 fade-in duration-300",
          sizeClass
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
