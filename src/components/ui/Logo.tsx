import React from 'react';
import { useBrand } from '../../context/BrandContext';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'full' | 'icon';
  theme?: 'light' | 'dark' | 'auto';
  customSchoolName?: string;
  customLogoUrl?: string | null;
  customPortalTitle?: string | null;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 40, 
  variant = 'full',
  theme = 'auto',
  customSchoolName,
  customLogoUrl,
  customPortalTitle,
}) => {
  const { branding, isSchoolPortal } = useBrand();

  const activeSchoolName = customSchoolName !== undefined ? customSchoolName : (isSchoolPortal ? branding.schoolName : undefined);
  const activeLogoUrl = customLogoUrl !== undefined ? customLogoUrl : (isSchoolPortal ? branding.logoUrl : null);
  const activePortalTitle = customPortalTitle !== undefined ? customPortalTitle : (isSchoolPortal ? (branding.portalTitle || activeSchoolName) : activeSchoolName);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [activeLogoUrl]);

  return (
    <div className={`inline-flex items-center ${variant === 'full' ? 'gap-2.5' : ''} ${className}`}>
      {/* Icon or School Logo */}
      <div 
        className="relative flex items-center justify-center shrink-0 select-none"
        style={{ width: size, height: size }}
      >
        {activeLogoUrl && !imgError ? (
          <img 
            src={activeLogoUrl} 
            alt={activeSchoolName || 'School Logo'} 
            onError={() => setImgError(true)}
            className="w-full h-full object-contain rounded-lg transition-transform duration-200 hover:scale-105" 
          />
        ) : activeSchoolName ? (
          <span aria-label={`${activeSchoolName} initials`} className="w-full h-full rounded-xl flex items-center justify-center font-black" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-on-primary)', fontSize: size * 0.3 }}>
            {activeSchoolName.split(/\s+/).filter(Boolean).slice(0, 3).map(word => word[0]).join('')}
          </span>
        ) : (
          /* GlobePen Stylized Icon: Orbital Globe + Precision Quill Nib */
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full transition-transform duration-300 hover:scale-105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-primary, #2563EB)" />
                <stop offset="100%" stopColor="var(--brand-secondary, #06B6D4)" />
              </linearGradient>
              <linearGradient id="nibGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
            </defs>

            {/* Orbital Globe Arc */}
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              stroke="url(#globeGrad)" 
              strokeWidth="6" 
              strokeDasharray="180 50" 
              className="opacity-90"
            />
            
            {/* Latitude Ellipse Arc */}
            <ellipse 
              cx="50" 
              cy="50" 
              rx="40" 
              ry="18" 
              stroke="url(#globeGrad)" 
              strokeWidth="4" 
              strokeDasharray="120 70" 
              transform="rotate(-25 50 50)" 
              className="opacity-60"
            />

            {/* Precision Pen Nib (Angled 45 deg) */}
            <path 
              d="M 50 20 L 68 45 L 56 50 L 52 75 L 48 75 L 44 50 L 32 45 Z" 
              fill="url(#nibGrad)"
              transform="rotate(35 50 50)"
            />

            {/* Ink Nib Core */}
            <circle 
              cx="50" 
              cy="48" 
              r="3.5" 
              fill="var(--brand-secondary, #06B6D4)"
              transform="rotate(35 50 50)"
            />
          </svg>
        )}
      </div>

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          {activeSchoolName ? (
            <>
              <span className={`text-base font-extrabold tracking-tight truncate max-w-[200px] ${
                theme === 'dark' ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}>
                {activePortalTitle || activeSchoolName}
              </span>
              <span className="text-[0.625rem] font-medium tracking-wider text-slate-400 dark:text-slate-400 mt-1 uppercase flex items-center gap-1">
                Powered by <strong className="text-indigo-400 dark:text-indigo-400 font-bold">GlobePen</strong>
              </span>
            </>
          ) : (
            <>
              <div className="text-xl tracking-tight font-sans">
                <span className={`font-black ${
                  theme === 'dark' ? 'text-slate-100' : 
                  theme === 'light' ? 'text-slate-900' : 
                  'text-slate-900 dark:text-slate-100'
                }`}>Globe</span>
                <span className="font-bold text-[var(--brand-primary,#2563EB)] ml-0.5">Pen</span>
              </div>
              <span className={`text-[0.6rem] font-bold tracking-[0.2em] mt-1 uppercase ${
                theme === 'dark' ? 'text-slate-400' : 
                theme === 'light' ? 'text-slate-500' : 
                'text-slate-500 dark:text-slate-400'
              }`}>
                School Management
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
