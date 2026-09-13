import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'full' | 'icon';
  theme?: 'light' | 'dark' | 'auto';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 40, 
  variant = 'full',
  theme = 'auto'
}) => {
  // Determine fill color and class name based on theme
  const uPathFill = theme === 'dark' ? '#F1F5F9' : '#1E293B';
  const uPathClass = theme === 'auto' 
    ? 'dark:fill-slate-300 transition-colors duration-200' 
    : 'transition-colors duration-200';

  return (
    <div className={`inline-flex items-center ${variant === 'full' ? 'gap-2.5' : ''} ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0 select-none animate-fade-in"
        style={{ width: size, height: size }}
      >
        {/* Modern UpRecord Custom Logomark */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full transition-transform duration-300 hover:scale-105"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grounded Secure "U" Container in Slate Blue (#1E293B) / Slate Light (#F1F5F9) */}
          <path 
            d="M 15 15 L 37.5 15 L 37.5 50 C 37.5 62, 62.5 62, 62.5 50 L 85 50 C 85 80, 15 80, 15 50 Z" 
            fill={uPathFill} 
            className={uPathClass}
          />

          {/* Breakout Upward Arrow stroke in Crimson Red (#DC2626) */}
          <path 
            d="M 62.5 50 L 62.5 38 L 51.25 38 L 73.75 10 L 96.25 38 L 85 38 L 85 50 Z" 
            fill="#DC2626"
            className="transition-colors duration-200"
          />
        </svg>
      </div>

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <div className="text-xl tracking-tight font-sans">
            <span className={`font-black ${
              theme === 'dark' ? 'text-slate-100' : 
              theme === 'light' ? 'text-[#1E293B]' : 
              'text-[#1E293B] dark:text-slate-100'
            }`}>Up</span>
            <span className={`font-medium ${
              theme === 'dark' ? 'text-red-500' : 
              theme === 'light' ? 'text-[#DC2626]' : 
              'text-[#DC2626] dark:text-red-500'
            }`}>Record</span>
          </div>
          <span className={`text-[0.6rem] font-bold tracking-[0.25em] mt-1 uppercase ${
            theme === 'dark' ? 'text-slate-400' : 
            theme === 'light' ? 'text-slate-500' : 
            'text-slate-500 dark:text-slate-400'
          }`}>
            School Portal
          </span>
        </div>
      )}
    </div>
  );
};
