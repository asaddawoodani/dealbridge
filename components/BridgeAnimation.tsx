"use client";

export default function BridgeAnimation() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center" aria-hidden="true">
      <svg
        viewBox="0 0 1200 500"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-[1400px] opacity-[0.35]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
          @keyframes growUp {
            from { transform: scaleY(0); }
            to { transform: scaleY(1); }
          }
          @keyframes drawLine {
            from { stroke-dashoffset: 400; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes expandDeck {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
          @keyframes glowPulse {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }

          .tower {
            transform-origin: bottom center;
            animation: growUp 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            opacity: 0;
            animation-fill-mode: forwards;
          }
          .tower { animation-name: growUp, fadeIn; opacity: 1; }

          .cable {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            animation: drawLine 1.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }

          .deck {
            transform-origin: center;
            animation: expandDeck 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }

          .glow {
            animation: glowPulse 3.5s ease-in-out infinite;
          }

          /* Stagger delays */
          .tower-1 { animation-delay: 0s; }
          .tower-2 { animation-delay: 0.15s; }
          .cable-1 { animation-delay: 0.4s; }
          .cable-2 { animation-delay: 0.5s; }
          .cable-3 { animation-delay: 0.6s; }
          .cable-4 { animation-delay: 0.7s; }
          .cable-5 { animation-delay: 0.45s; }
          .cable-6 { animation-delay: 0.55s; }
          .cable-7 { animation-delay: 0.65s; }
          .cable-8 { animation-delay: 0.75s; }
          .deck-line { animation-delay: 0.3s; }
          .glow-1 { animation-delay: 1.2s; }
          .glow-2 { animation-delay: 1.5s; }

          /* Background bridge delays */
          .bg-tower-1 { animation-delay: 0.3s; }
          .bg-tower-2 { animation-delay: 0.45s; }
          .bg-cable-1 { animation-delay: 0.7s; }
          .bg-cable-2 { animation-delay: 0.8s; }
          .bg-cable-3 { animation-delay: 0.9s; }
          .bg-cable-4 { animation-delay: 1.0s; }
          .bg-deck { animation-delay: 0.6s; }
        `}</style>

        {/* Grid dots */}
        <defs>
          <pattern id="grid-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.8" fill="#14b8a6" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="1200" height="500" fill="url(#grid-dots)" />

        {/* ── Background bridge (smaller, for depth) ── */}
        <g opacity="0.35" transform="translate(150, 80) scale(0.55)">
          {/* Left tower */}
          <rect className="tower bg-tower-1" x="340" y="160" width="6" height="200" rx="2" fill="#10b981" />
          {/* Right tower */}
          <rect className="tower bg-tower-2" x="854" y="160" width="6" height="200" rx="2" fill="#10b981" />
          {/* Deck */}
          <line className="deck bg-deck" x1="240" y1="355" x2="960" y2="355" stroke="#10b981" strokeWidth="2.5" />
          {/* Cables from left tower */}
          <line className="cable bg-cable-1" x1="343" y1="170" x2="260" y2="350" stroke="#10b981" strokeWidth="1" />
          <line className="cable bg-cable-2" x1="343" y1="170" x2="420" y2="350" stroke="#10b981" strokeWidth="1" />
          {/* Cables from right tower */}
          <line className="cable bg-cable-3" x1="857" y1="170" x2="780" y2="350" stroke="#10b981" strokeWidth="1" />
          <line className="cable bg-cable-4" x1="857" y1="170" x2="940" y2="350" stroke="#10b981" strokeWidth="1" />
        </g>

        {/* ── Foreground bridge (main) ── */}
        <g>
          {/* Left tower */}
          <rect className="tower tower-1" x="340" y="180" width="8" height="220" rx="3" fill="#14b8a6" />
          {/* Right tower */}
          <rect className="tower tower-2" x="852" y="180" width="8" height="220" rx="3" fill="#14b8a6" />

          {/* Deck line */}
          <line className="deck deck-line" x1="200" y1="395" x2="1000" y2="395" stroke="#14b8a6" strokeWidth="3" />

          {/* Cables from left tower */}
          <line className="cable cable-1" x1="344" y1="190" x2="220" y2="390" stroke="#14b8a6" strokeWidth="1.2" />
          <line className="cable cable-2" x1="344" y1="190" x2="280" y2="390" stroke="#14b8a6" strokeWidth="1.2" />
          <line className="cable cable-3" x1="344" y1="190" x2="410" y2="390" stroke="#14b8a6" strokeWidth="1.2" />
          <line className="cable cable-4" x1="344" y1="190" x2="470" y2="390" stroke="#14b8a6" strokeWidth="1.2" />

          {/* Cables from right tower */}
          <line className="cable cable-5" x1="856" y1="190" x2="730" y2="390" stroke="#14b8a6" strokeWidth="1.2" />
          <line className="cable cable-6" x1="856" y1="190" x2="790" y2="390" stroke="#14b8a6" strokeWidth="1.2" />
          <line className="cable cable-7" x1="856" y1="190" x2="920" y2="390" stroke="#14b8a6" strokeWidth="1.2" />
          <line className="cable cable-8" x1="856" y1="190" x2="980" y2="390" stroke="#14b8a6" strokeWidth="1.2" />

          {/* Tower cap glows */}
          <circle className="glow glow-1" cx="344" cy="180" r="6" fill="#14b8a6" opacity="0" />
          <circle className="glow glow-2" cx="856" cy="180" r="6" fill="#14b8a6" opacity="0" />
        </g>
      </svg>
    </div>
  );
}
