'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function GlobalErrorBoundary({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
 // Log the error to an error reporting service
 console.error('Frontend Error caught by boundary:', error);
 }, [error]);

 return (
 <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-in fade-in zoom-in-95 duration-500">
 <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6 shadow-inner ring-1 ring-red-500/20">
 <AlertTriangle size={32} />
 </div>
 
 <h2 className="text-2xl font-bold mb-2">Terjadi Kesalahan</h2>
 <p className="text-muted-foreground mb-8 max-w-md">
 Sistem mendeteksi adanya error pada komponen ini. Jangan khawatir, sisa aplikasi tetap berjalan normal.
 </p>

 <div className="flex flex-col sm:flex-row gap-4">
 <button
 onClick={() => reset()}
 className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95"
 >
 <RefreshCw size={18} />
 Coba Muat Ulang
 </button>
 <Link
 href="/app"
 className="flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-hover border border-surface-border font-bold rounded-xl transition-all active:scale-95"
 >
 Kembali ke Dashboard
 </Link>
 </div>

 {process.env.NODE_ENV === 'development' && (
 <div className="mt-10 p-4 bg-surface-hover border border-red-500/30 rounded-xl max-w-2xl w-full text-left overflow-x-auto text-xs font-mono text-red-400">
 <p className="font-bold mb-2">Dev Detail:</p>
 {error.message}
 {error.stack && (
 <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
 {error.stack}
 </pre>
 )}
 </div>
 )}
 </div>
 );
}
