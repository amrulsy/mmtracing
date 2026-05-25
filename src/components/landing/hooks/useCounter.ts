"use client";

import { useState, useEffect } from "react";

export function useCounter(end: number, shouldStart: boolean, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, shouldStart]);
  return count;
}

export function parseStatValue(val: string): { num: number; suffix: string } {
  const match = val.match(/([\d,.]+)(.*)/);
  if (!match) return { num: 0, suffix: val };
  return { num: parseFloat(match[1].replace(/,/g, "")), suffix: match[2] };
}
