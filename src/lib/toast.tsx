import { toast as sonnerToast } from "sonner";
import React from "react";

// Wrapper API to standardize toast formats across the app
export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, { description });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, { description });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, { description });
  },
  promise: sonnerToast.promise,
  // Custom confirm dialog via toast
  confirm: (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    const toastId = sonnerToast(
      <div className="flex flex-col gap-3 w-full">
        <div className="font-medium text-sm">{message}</div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-xs font-medium bg-surface border border-surface-border rounded-lg hover:bg-surface-hover"
            onClick={() => {
              sonnerToast.dismiss(toastId);
              if (onCancel) onCancel();
            }}
          >
            Batal
          </button>
          <button
            className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 shadow-sm"
            onClick={() => {
              sonnerToast.dismiss(toastId);
              onConfirm();
            }}
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>,
      { 
        duration: 10000, 
        position: "top-center",
      }
    );
  }
};
