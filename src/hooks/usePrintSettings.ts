"use client";

import { useState, useCallback } from "react";

export type PrintFormat = "thermal-80";

export const PRINT_FORMAT_STORAGE_KEY = "mm_print_format";

export function getPrintFormat(): PrintFormat {
  return "thermal-80";
}

export function setPrintFormat(format: PrintFormat): void {
  // No-op since we only have one format now
}

/**
 * Custom hook for centralizing print format selection across the application.
 */
export function usePrintSettings(): [PrintFormat, (f: PrintFormat) => void] {
  const [format, setFormatState] = useState<PrintFormat>("thermal-80");

  const changeFormat = useCallback((f: PrintFormat) => {
    setFormatState(f);
  }, []);

  return [format, changeFormat];
}
