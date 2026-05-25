"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";

export default function GalleryImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 group-hover:scale-110 transition-transform duration-300">
        <Wrench size={40} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
      onError={() => setFailed(true)}
    />
  );
}
