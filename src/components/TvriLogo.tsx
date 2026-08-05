import React, { useState } from 'react';
import tvriLogoAsset from '../assets/images/TVRI_logo.png';

interface TvriLogoProps {
  className?: string;
}

export const TvriLogo: React.FC<TvriLogoProps> = ({ className = "w-10 h-10" }) => {
  const [imageError, setImageError] = useState(false);

  if (!imageError) {
    return (
      <img
        src={tvriLogoAsset}
        alt="TVRI Logo"
        className={`${className} object-contain rounded-lg bg-white/10 p-1 border border-white/10`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`${className} relative inline-flex items-center justify-center shrink-0 rounded-lg bg-blue-700 p-1 border border-blue-400/30 overflow-hidden shadow-sm`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-white"
      >
        <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
        <path
          d="M 15 52 C 25 28, 75 28, 85 52 C 75 76, 25 76, 15 52 Z"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <g fill="currentColor">
          <path d="M 18 38 H 36 V 43 H 29 V 64 H 23 V 43 H 18 Z" />
          <path d="M 37 38 H 43 L 48 57 L 53 38 H 59 L 51 64 H 45 Z" />
          <path d="M 60 38 H 71 C 76 38, 79 40, 79 44 C 79 47, 77 49, 74 50 L 80 64 H 74 L 69 51 H 65 V 64 H 60 Z M 65 43 V 47 H 70 C 72 47, 73 46, 73 45 C 73 44, 72 43, 70 43 Z" />
          <path d="M 82 38 H 87 V 64 H 82 Z" />
        </g>
        <circle cx="84.5" cy="33" r="2.5" fill="#38BDF8" />
      </svg>
    </div>
  );
};
