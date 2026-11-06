import React, { useEffect, useState } from 'react';
import { Home } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Respect user's reduced-motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      onComplete();
      return;
    }

    // Begin fade-out at 4.5s, unmount at exactly 5.0s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 4500);

    const endTimer = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onComplete, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7F7F2] select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Skip button for user convenience */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-6 right-6 px-3 py-1.5 rounded-full text-xs font-medium text-[#718096] hover:text-[#202A35] bg-white/70 hover:bg-white border border-[#E7E7E0] transition-all shadow-subtle cursor-pointer z-10"
      >
        Skip Intro
      </button>

      {/* Main Animation Container */}
      <div className="relative flex flex-col items-center justify-center max-w-lg w-full px-6 space-y-6">
        {/* Animated Room Wireframe SVG */}
        <div className="relative w-full aspect-[4/3] max-w-[380px] sm:max-w-[420px] mx-auto overflow-hidden rounded-2xl bg-white/80 border border-[#E7E7E0] shadow-card p-4 flex items-center justify-center">
          <svg
            viewBox="0 0 400 300"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Scan Beam Gradient */}
              <linearGradient id="scanBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#087E8B" stopOpacity="0" />
                <stop offset="50%" stopColor="#087E8B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#087E8B" stopOpacity="0" />
              </linearGradient>

              {/* Grid pattern for architectural perspective */}
              <pattern id="archGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E7E7E0" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Background Perspective Grid */}
            <rect width="400" height="300" fill="url(#archGrid)" opacity="0.4" />

            {/* Ceiling surface (Neutral) */}
            <path
              d="M 0,10 L 400,10 L 290,65 L 110,65 Z"
              fill="#F7F7F2"
              className="splash-ceiling"
            />

            {/* Left Wall surface (Animates to Blue #2878E5) */}
            <path
              d="M 0,10 L 110,65 L 110,185 L 0,240 Z"
              className="splash-wall-left"
            />

            {/* Back Wall surface (Animates to Blue #2878E5) */}
            <path
              d="M 110,65 L 290,65 L 290,185 L 110,185 Z"
              className="splash-wall-back"
            />

            {/* Right Wall surface (Animates to Blue #2878E5) */}
            <path
              d="M 290,65 L 400,10 L 400,240 L 290,185 Z"
              className="splash-wall-right"
            />

            {/* Floor surface (Animates to Green #22A06B) */}
            <path
              d="M 0,240 L 110,185 L 290,185 L 400,240 L 400,300 L 0,300 Z"
              className="splash-floor"
            />

            {/* Room Wireframe Outlines (Drawn with SVG stroke animation) */}
            {/* Outer Box */}
            <path
              d="M 0,10 L 400,10 L 400,240 L 0,240 Z"
              className="splash-wireframe"
              stroke="#202A35"
              strokeWidth="1.5"
            />
            {/* Back Wall Box */}
            <path
              d="M 110,65 L 290,65 L 290,185 L 110,185 Z"
              className="splash-wireframe"
              stroke="#202A35"
              strokeWidth="1.5"
            />
            {/* 4 Perspective Corner Beams */}
            <line x1="0" y1="10" x2="110" y2="65" className="splash-wireframe" stroke="#202A35" strokeWidth="1.5" />
            <line x1="400" y1="10" x2="290" y2="65" className="splash-wireframe" stroke="#202A35" strokeWidth="1.5" />
            <line x1="0" y1="240" x2="110" y2="185" className="splash-wireframe" stroke="#202A35" strokeWidth="1.5" />
            <line x1="400" y1="240" x2="290" y2="185" className="splash-wireframe" stroke="#202A35" strokeWidth="1.5" />

            {/* AI Scanning Beam Line sweeping across the room */}
            <rect
              y="0"
              width="30"
              height="300"
              fill="url(#scanBeam)"
              className="splash-scan-line"
            />

            {/* Wall Detection Tag */}
            <g className="splash-tag-wall">
              <rect x="155" y="80" width="90" height="22" rx="6" fill="#2878E5" />
              <text x="200" y="95" fill="white" fontSize="9" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
                WALL DETECTED
              </text>
            </g>

            {/* Floor Detection Tag */}
            <g className="splash-tag-floor">
              <rect x="150" y="235" width="100" height="22" rx="6" fill="#22A06B" />
              <text x="200" y="250" fill="white" fontSize="9" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
                FLOOR DETECTED
              </text>
            </g>
          </svg>
        </div>

        {/* Branding & Tagline with Smooth Fade-in */}
        <div className="text-center space-y-2 splash-branding">
          <div className="inline-flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#087E8B] text-white flex items-center justify-center shadow-md shadow-teal-700/20">
              <Home className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202A35]">
                RoomVision
              </span>
              <span className="px-2 py-0.5 text-xs font-bold bg-[#def2f4] text-[#087E8B] rounded-md tracking-wider">
                AI
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-medium text-[#718096] tracking-wide splash-tagline">
            Intelligent Wall & Floor Detection
          </p>
        </div>

        {/* Progress Bar (5s sync) */}
        <div className="w-48 h-1 bg-[#E7E7E0] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#087E8B] via-[#2878E5] to-[#22A06B] splash-progress rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

