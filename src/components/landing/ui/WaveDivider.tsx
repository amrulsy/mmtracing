interface WaveDividerProps {
  flip?: boolean;
  className?: string;
  color?: string;
}

export default function WaveDivider({ flip = false, className = "", color }: WaveDividerProps) {
  return (
    <div className={`relative w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
        <path
          d="M0,32 C240,56 480,8 720,32 C960,56 1200,8 1440,32 L1440,56 L0,56 Z"
          className={color || "fill-background"}
        />
      </svg>
    </div>
  );
}
