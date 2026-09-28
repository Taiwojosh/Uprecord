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
    <div className={`inline-flex min-w-0 items-center ${variant === 'full' ? 'gap-2.5' : ''} ${className}`}>
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
          /* SeferNote open-book mark */
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full transition-transform duration-300 hover:scale-105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="7" y="7" width="86" height="86" rx="23" fill="var(--brand-primary, #2563EB)" />
            <path d="M22 31c11-4 20-3 28 3v42c-8-6-17-7-28-3V31Zm56 0c-11-4-20-3-28 3v42c8-6 17-7 28-3V31Z" fill="none" stroke="white" strokeWidth="5" strokeLinejoin="round" />
            <path d="M50 34v42M28 42c6-1 11 0 16 3M56 45c5-3 10-4 16-3" stroke="white" strokeWidth="4" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {variant === 'full' && (
        <div className="flex min-w-0 flex-col leading-none">
          {activeSchoolName ? (
            <>
              <span title={activePortalTitle || activeSchoolName} className={`text-sm font-bold tracking-tight leading-snug break-words line-clamp-2 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}>
                {activePortalTitle || activeSchoolName}
              </span>
              <span className="text-[9px] font-normal tracking-wide text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                Powered by <span className="text-indigo-400 dark:text-indigo-400 font-medium">SeferNote</span>
              </span>
            </>
          ) : (
            <>
              <div className="text-xl tracking-tight font-sans">
                <span className={`font-black ${
                  theme === 'dark' ? 'text-slate-100' : 
                  theme === 'light' ? 'text-slate-900' : 
                  'text-slate-900 dark:text-slate-100'
                }`}>Sefer</span>
                <span className="font-bold text-[var(--brand-primary,#2563EB)] ml-0.5">Note</span>
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
