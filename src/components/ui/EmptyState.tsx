import React from 'react';
import * as Icons from 'lucide-react';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

/** Backwards-compatible empty state: `icon` + `message` are the legacy keys;
    `title` and `action` add hierarchy and a next step. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  // Dynamically get the icon component from lucide-react
  const IconComponent = (Icons as any)[icon || 'Search'] || Icons.Search;

  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-16 h-16 bg-[var(--app-surface-2)] rounded-full flex items-center justify-center mb-4 text-[var(--app-text-subtle)]">
        <IconComponent className="w-8 h-8" strokeWidth={1.5} aria-hidden="true" />
      </div>
      {title && (
        <h3 className="text-base font-bold text-[var(--app-text)] leading-snug">
          {title}
        </h3>
      )}
      {message && (
        <p className="mt-1 text-sm text-[var(--app-text-muted)] max-w-[320px] leading-relaxed font-medium">
          {message}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
};
