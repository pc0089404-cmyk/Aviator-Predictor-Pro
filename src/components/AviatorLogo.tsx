import React from 'react';

interface AviatorLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const AviatorLogo: React.FC<AviatorLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Real iconic Spribe Aviator ascending red monoplane */}
      <div
        className={`${iconSizes[size]} relative flex-shrink-0 flex items-center justify-center filter drop-shadow-[0_0_14px_rgba(239,68,68,0.9)]`}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Real Aviator Red Gradient for fuselage and wings */}
            <linearGradient id="aviatorRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff1744" />
              <stop offset="60%" stopColor="#d50000" />
              <stop offset="100%" stopColor="#9b0000" />
            </linearGradient>

            {/* Glowing speed curve trail */}
            <linearGradient id="aviatorTrail" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d50000" stopOpacity="0" />
              <stop offset="50%" stopColor="#ff1744" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
            </linearGradient>

            {/* Wing highlight */}
            <linearGradient id="wingHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff5252" />
              <stop offset="100%" stopColor="#b71c1c" />
            </linearGradient>
          </defs>

          {/* Aerodynamic flight smoke trail behind jet */}
          <path
            d="M 12 102 C 32 96, 56 82, 80 54"
            stroke="url(#aviatorTrail)"
            strokeWidth="5"
            strokeLinecap="round"
            className="opacity-75"
          />
          <path
            d="M 22 110 C 44 100, 68 84, 88 58"
            stroke="url(#aviatorTrail)"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-40"
          />

          {/* Authentic Aviator Monoplane in banking climb */}
          <g transform="translate(18, 12) rotate(-18 50 50)">
            {/* Propeller hub with spinning disc effect */}
            <ellipse cx="94" cy="46" rx="3.5" ry="3.5" fill="#FFFFFF" />
            <path
              d="M93 30 C 95 30, 95 62, 93 62 C 91 62, 91 30, 93 30 Z"
              fill="#FFFFFF"
              className="opacity-80 animate-spin origin-[93px_46px]"
              style={{ animationDuration: '0.35s' }}
            />

            {/* Main fuselage with realistic Aviator curve */}
            <path
              d="M 14 62 C 28 58, 56 50, 85 43 C 92 41, 95 44, 95 47 C 94 51, 84 55, 62 61 C 36 68, 20 70, 14 62 Z"
              fill="url(#aviatorRedGrad)"
              stroke="#ff5252"
              strokeWidth="0.8"
            />

            {/* Cockpit canopy glass */}
            <path
              d="M 52 49 C 60 44, 73 42, 80 44 C 74 48, 62 52, 52 49 Z"
              fill="#FFFFFF"
              className="opacity-95"
            />

            {/* Left banking swept wing */}
            <path
              d="M 44 52 L 20 25 C 24 23, 30 23, 36 26 L 60 48 Z"
              fill="url(#wingHighlight)"
              stroke="#ff8a80"
              strokeWidth="0.7"
            />

            {/* Right underside wing */}
            <path
              d="M 54 56 L 60 84 C 57 86, 51 85, 47 81 L 48 57 Z"
              fill="#880e4f"
              stroke="#ad1457"
              strokeWidth="0.5"
            />

            {/* Tail fin vertical stabilizer */}
            <path
              d="M 16 63 L 7 48 C 10 46, 15 47, 18 51 L 22 62 Z"
              fill="url(#wingHighlight)"
              stroke="#ff8a80"
              strokeWidth="0.6"
            />
          </g>
        </svg>
      </div>

      {/* Official Aviator Wordmark */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`${textSizes[size]} font-black italic tracking-tighter uppercase text-white drop-shadow-[0_2px_12px_rgba(255,23,68,0.7)]`}
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transform: 'skewX(-10deg)',
                letterSpacing: '-0.04em',
              }}
            >
              Aviator
            </span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_10px_#ff1744] tracking-wider border border-red-400/40">
              PRO
            </span>
          </div>
          <span className="text-[9px] font-mono tracking-widest text-red-400 font-bold uppercase -mt-0.5">
            PREDICTOR ENGINE
          </span>
        </div>
      )}
    </div>
  );
};
