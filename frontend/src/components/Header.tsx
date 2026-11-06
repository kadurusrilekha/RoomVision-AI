import React from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { BackendHealth } from '../types';

interface HeaderProps {
  health: BackendHealth;
  isCheckingHealth: boolean;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ health, isCheckingHealth, onRefreshHealth }) => {
  const handleHomeClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E7E0] transition-all shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Clean Home Icon */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleHomeClick}
            aria-label="Go to Home / Scroll to top"
            className="p-2 -ml-2 rounded-xl text-[#087E8B] hover:text-[#06545d] hover:bg-[#def2f4]/60 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#087E8B]/30 active:scale-95 cursor-pointer"
            title="Home"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={handleHomeClick}
            className="text-left focus:outline-none group cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-[#202A35] group-hover:text-[#087E8B] transition-colors">
                RoomVision
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#def2f4] text-[#087E8B] rounded-md tracking-wide">
                AI
              </span>
            </div>
            <p className="text-xs text-[#718096] hidden sm:block font-normal">
              AI-powered Wall and Floor Detection
            </p>
          </button>
        </div>

        {/* Dynamic Status Indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#F7F7F2] text-xs font-medium border border-[#E7E7E0]">
            {isCheckingHealth || health.status === 'initializing' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#087E8B] animate-pulse"></span>
                <span className="text-[#202A35] font-medium">Connecting...</span>
              </>
            ) : health.status === 'healthy' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22A06B]"></span>
                </span>
                <span className="text-[#202A35] font-medium">AI Model Ready</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span className="text-rose-700 font-medium">Offline</span>
              </>
            )}

            <button
              onClick={onRefreshHealth}
              disabled={isCheckingHealth}
              className="ml-1 text-[#718096] hover:text-[#087E8B] transition-colors p-0.5 rounded cursor-pointer disabled:opacity-50"
              title="Refresh connection status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin text-[#087E8B]' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
