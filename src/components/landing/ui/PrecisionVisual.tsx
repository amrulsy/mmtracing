"use client";

import { useRef, type PointerEvent } from "react";

export default function PrecisionVisual() {
  const root = useRef<HTMLDivElement>(null);
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    root.current?.style.setProperty("--precision-x", `${((event.clientY - rect.top) / rect.height - .5) * -5}deg`);
    root.current?.style.setProperty("--precision-y", `${((event.clientX - rect.left) / rect.width - .5) * 7}deg`);
  };
  return <div ref={root} className="precision-visual" onPointerMove={tilt} onPointerLeave={() => { root.current?.style.setProperty("--precision-x", "0deg"); root.current?.style.setProperty("--precision-y", "0deg"); }}>
    <div className="precision-meta"><span>MMT / PRECISION SERIES</span><span>01 — CUSTOM PART</span></div>
    <svg viewBox="0 0 640 460" role="img" aria-label="Ilustrasi komponen bubut logam" className="precision-svg"><defs><linearGradient id="metal" x1="0" x2="1"><stop stopColor="#4b5059"/><stop offset=".22" stopColor="#e2e5e8"/><stop offset=".5" stopColor="#606772"/><stop offset=".75" stopColor="#d6dade"/><stop offset="1" stopColor="#383d46"/></linearGradient><radialGradient id="face"><stop stopColor="#111318" offset=".33"/><stop stopColor="#4e5661" offset=".72"/><stop stopColor="#d7dbe0" offset="1"/></radialGradient><radialGradient id="glow"><stop stopColor="#dc2626" stopOpacity=".42"/><stop offset="1" stopColor="#dc2626" stopOpacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="16"/></filter></defs><ellipse cx="324" cy="363" rx="245" ry="80" fill="url(#glow)"/><ellipse cx="320" cy="382" rx="180" ry="20" fill="#000" opacity=".65" filter="url(#blur)"/><g transform="rotate(-20 320 230)"><path d="M145 245v60c0 75 350 75 350 0v-60" fill="url(#metal)" stroke="#9ea5ae"/><ellipse cx="320" cy="245" rx="175" ry="90" fill="url(#metal)" stroke="#f0f2f4"/><ellipse cx="320" cy="245" rx="146" ry="72" fill="none" stroke="#30353d" strokeWidth="4"/><path d="M190 173v72c0 54 260 54 260 0v-72" fill="url(#metal)" stroke="#9ea5ae"/><ellipse cx="320" cy="173" rx="130" ry="66" fill="url(#metal)" stroke="#f0f2f4"/><ellipse cx="320" cy="173" rx="103" ry="51" fill="url(#face)" stroke="#707984" strokeWidth="3"/>{[205,218,231,244].map(y => <path key={y} d={`M190 ${y}c0 54 260 54 260 0`} fill="none" stroke="#242932" strokeOpacity=".55" strokeWidth="3"/>)}{[[183,241],[236,311],[404,310],[457,241]].map(([x, y]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="10" ry="5" fill="#15181d" stroke="#cbd0d5"/>)}</g><g stroke="#b8bec7" strokeWidth="1" fill="none" opacity=".6"><path d="M385 119h110l30-32M158 280H84l-35 36M140 391h360"/><circle cx="385" cy="119" r="4"/><circle cx="158" cy="280" r="4"/></g><g fill="#cbd0d5" fontFamily="monospace" fontSize="11"><text x="482" y="76">DETAIL / 01</text><text x="34" y="335">MACHINED PART</text><text x="277" y="414">PRECISION</text></g></svg>
    <div className="precision-caption"><span className="precision-dot"/>Detail kecil. Peran besar.<small>Ilustrasi komponen</small></div>
  </div>;
}
