/**
 * Slipper8s Logo — Elegant glass slipper with a figure-8 shaped heel.
 * Cinderella-inspired pump silhouette viewed from the side.
 * The heel is literally the number 8, making the brand instantly recognizable.
 * Uses currentColor so it inherits text/brand color from parent.
 */

interface Slipper8sLogoProps {
  /** Height in pixels — width scales proportionally */
  size?: number
  className?: string
}

export function Slipper8sLogo({ size = 36, className }: Slipper8sLogoProps) {
  const w = Math.round(size * 1.5)
  const h = size

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 72 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Slipper8s"
    >
      {/* ── Glass slipper body — elegant Cinderella pump silhouette ──────
          Toe on the left, sweeping vamp, open back connecting to heel.
          ─────────────────────────────────────────────────────────────── */}
      <path
        d="M 8 40
           C 4 40 3 34 5 28
           C 8 18 18 8 30 6
           C 38 5 44 8 48 14
           L 48 18"
        fill="currentColor"
        fillOpacity="0.10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* ── Shoe interior / foot opening curve ─────────────────────────── */}
      <path
        d="M 30 12
           C 36 11 42 13 48 18"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeOpacity="0.25"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Sole — connects toe to heel along the ground ────────────── */}
      <path
        d="M 8 40 C 16 41 32 41 42 40 L 48 40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* ── Figure-8 heel — the signature brand element ──────────────
          Two loops forming a clear "8" shape:
          • Top loop connects to the shoe body (wider, sturdier)
          • Bottom loop tapers to the ground (narrower, elegant)
          • Pinch point creates the unmistakable 8
          ──────────────────────────────────────────────────────────── */}
      <path
        d="M 48 18
           C 57 18 57 28 48 28
           C 55 28 55 40 48 40
           C 42 40 42 28 48 28
           C 40 28 40 18 48 18
           Z"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* ── Glass highlight — shine arc across the vamp ──────────── */}
      <path
        d="M 12 22 C 18 14 26 10 36 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.35"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Sparkle accents — glass/crystal shimmer ──────────────── */}
      {/* Main sparkle */}
      <g opacity="0.5" fill="currentColor">
        <line x1="18" y1="12" x2="18" y2="18" stroke="currentColor" strokeWidth="1.2" />
        <line x1="15" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.2" />
      </g>
      {/* Small sparkle */}
      <g opacity="0.3" fill="currentColor">
        <line x1="34" y1="7" x2="34" y2="11" stroke="currentColor" strokeWidth="1" />
        <line x1="32" y1="9" x2="36" y2="9" stroke="currentColor" strokeWidth="1" />
      </g>
    </svg>
  )
}
