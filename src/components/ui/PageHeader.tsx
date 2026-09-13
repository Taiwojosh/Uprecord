import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  titleStyle?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
  metaSpans?: { text: string; style?: React.CSSProperties }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  actions,
  titleStyle,
  iconStyle,
  metaSpans
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-start gap-4">
        {Icon && (
          <div 
            className="w-12 h-12 bg-white rounded-md shadow-card border border-border flex items-center justify-center text-primary shrink-0"
            style={iconStyle}
          >
            <Icon className="w-6 h-6" strokeWidth={2} />
          </div>
        )}
        <div className="flex flex-col">
          <h1 
            className="text-xl sm:text-[1.75rem] font-bold text-slate-800 tracking-tight leading-tight"
            style={titleStyle}
          >
            {title}
          </h1>
          {metaSpans && metaSpans.length > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              {metaSpans.map((s, idx) => (
                <span key={idx} style={s.style} className="text-gray-500 font-medium">
                  {s.text}
                </span>
              ))}
            </div>
          ) : (
            subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 sm:mt-1 leading-snug">
                {subtitle}
              </p>
            )
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
