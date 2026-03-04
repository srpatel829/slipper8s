/**
 * Slipper8s Logo — Glass slipper with the number 8 incorporated.
 * Uses currentColor so it inherits text/brand color from parent.
 * The "glass" effect comes from a low-opacity fill + stroke outline.
 */

interface Slipper8sLogoProps {
  /** Height in pixels — width scales proportionally (approx 1.4:1 ratio) */
  size?: number
  className?: string
}

export function Slipper8sLogo({ size = 36, className }: Slipper8sLogoProps) {
  // ViewBox: 52 wide × 38 tall
  const w = Math.round(size * 1.37)
  const h = size

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 52 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Slipper8s"
    >
      {/* ── Main slipper body ────────────────────────────────────────────
          Side-view pump / glass slipper:
          toe on the left, stiletto heel on the right
          ──────────────────────────────────────────────────────────────── */}
      <path
        d="M 5 26
           C 3 20 3 12 8 7
           C 14 2 26 1 37 4
           C 44 7 48 13 47 21
           L 47 26
           L 45 33
           L 42 33
           L 43 26
           C 40 25 33 25 22 25
           C 14 25 8 25 5 26
           Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* ── Glass highlight — subtle shine across the vamp ────────────── */}
      <path
        d="M 9 9 C 16 4 28 3 38 7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeOpacity="0.35"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Number 8 ─────────────────────────────────────────────────── */}
      <text
        x="24"
        y="21"
        fontSize="14"
        fontWeight="900"
        fill="currentColor"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Arial Black', 'Arial', system-ui, sans-serif"
        letterSpacing="-0.5"
      >
        8
      </text>
    </svg>
  )
}
