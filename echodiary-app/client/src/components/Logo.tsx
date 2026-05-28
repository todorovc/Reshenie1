interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/**
 * EchoDiary mark: a small constellation of waveform bars that taper from a
 * single seed line into a fuller wave — "one listen, written down".
 * Uses currentColor so it adapts to light/dark themes.
 */
export function Logo({ size = 28, withWordmark = true, className }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className ?? ""}`}
      aria-label="EchoDiary"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="text-primary"
      >
        <g
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="6" y1="16" x2="6" y2="16" />
          <line x1="11" y1="12" x2="11" y2="20" />
          <line x1="16" y1="6" x2="16" y2="26" />
          <line x1="21" y1="10" x2="21" y2="22" />
          <line x1="26" y1="14" x2="26" y2="18" />
        </g>
        <circle
          cx="16"
          cy="16"
          r="14.25"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
      </svg>
      {withWordmark && (
        <span className="font-display text-[1.05rem] font-medium tracking-tight text-foreground">
          EchoDiary
        </span>
      )}
    </span>
  );
}
