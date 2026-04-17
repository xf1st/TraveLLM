"use client"

export type AnimationType = "plane" | "suitcase" | "default"

interface LottieLoaderProps {
  type?: AnimationType
  className?: string
  loop?: boolean
}

export function LottieLoader({ className }: LottieLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className ?? ""}`}>
      <svg
        className="pl"
        viewBox="0 0 160 160"
        width="160"
        height="160"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" />
            <stop offset="100%" stopColor="#fff" />
          </linearGradient>
          <mask id="plMask1">
            <rect x="0" y="0" width="160" height="160" fill="url(#plGrad)" />
          </mask>
          <mask id="plMask2">
            <rect x="28" y="28" width="104" height="104" fill="url(#plGrad)" />
          </mask>
        </defs>

        {/* Ring — bottom layer */}
        <g>
          <g className="pl__ring-rotate">
            <circle
              className="pl__ring-stroke"
              cx="80" cy="80" r="72"
              fill="none"
              stroke="hsl(223,90%,55%)"
              strokeWidth="16"
              strokeDasharray="452.39 452.39"
              strokeDashoffset="452"
              strokeLinecap="round"
              transform="rotate(-45,80,80)"
            />
          </g>
        </g>

        {/* Ring — masked (gradient overlay) */}
        <g mask="url(#plMask1)">
          <g className="pl__ring-rotate">
            <circle
              className="pl__ring-stroke"
              cx="80" cy="80" r="72"
              fill="none"
              stroke="hsl(193,90%,55%)"
              strokeWidth="16"
              strokeDasharray="452.39 452.39"
              strokeDashoffset="452"
              strokeLinecap="round"
              transform="rotate(-45,80,80)"
            />
          </g>
        </g>

        {/* Ticks — bottom layer */}
        <g>
          <g
            strokeWidth="4"
            strokeDasharray="12 12"
            strokeDashoffset="12"
            strokeLinecap="round"
            transform="translate(80,80)"
          >
            {([-135, -90, -45, 0, 45, 90, 135, 180] as const).map((deg) => (
              <polyline
                key={deg}
                className="pl__tick"
                stroke="hsl(223,10%,90%)"
                points="0,2 0,14"
                transform={`rotate(${deg},0,0) translate(0,40)`}
              />
            ))}
          </g>
        </g>

        {/* Ticks — masked */}
        <g mask="url(#plMask1)">
          <g
            strokeWidth="4"
            strokeDasharray="12 12"
            strokeDashoffset="12"
            strokeLinecap="round"
            transform="translate(80,80)"
          >
            {([-135, -90, -45, 0, 45, 90, 135, 180] as const).map((deg) => (
              <polyline
                key={deg}
                className="pl__tick"
                stroke="hsl(223,90%,80%)"
                points="0,2 0,14"
                transform={`rotate(${deg},0,0) translate(0,40)`}
              />
            ))}
          </g>
        </g>

        {/* Arrows — bottom layer */}
        <g>
          <g transform="translate(64,28)">
            <g className="pl__arrows" transform="rotate(45,16,52)">
              <path
                fill="hsl(3,90%,55%)"
                d="M17.998,1.506l13.892,43.594c.455,1.426-.56,2.899-1.998,2.899H2.108c-1.437,0-2.452-1.473-1.998-2.899L14.002,1.506c.64-2.008,3.356-2.008,3.996,0Z"
              />
              <path
                fill="hsl(223,10%,90%)"
                d="M14.009,102.499L.109,58.889c-.453-1.421,.559-2.889,1.991-2.889H29.899c1.433,0,2.444,1.468,1.991,2.889l-13.899,43.61c-.638,2.001-3.345,2.001-3.983,0Z"
              />
            </g>
          </g>
        </g>

        {/* Arrows — masked */}
        <g mask="url(#plMask2)">
          <g transform="translate(64,28)">
            <g className="pl__arrows" transform="rotate(45,16,52)">
              <path
                fill="hsl(333,90%,55%)"
                d="M17.998,1.506l13.892,43.594c.455,1.426-.56,2.899-1.998,2.899H2.108c-1.437,0-2.452-1.473-1.998-2.899L14.002,1.506c.64-2.008,3.356-2.008,3.996,0Z"
              />
              <path
                fill="hsl(223,90%,80%)"
                d="M14.009,102.499L.109,58.889c-.453-1.421,.559-2.889,1.991-2.889H29.899c1.433,0,2.444,1.468,1.991,2.889l-13.899,43.61c-.638,2.001-3.345,2.001-3.983,0Z"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
