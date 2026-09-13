import React from 'react';
import * as Icons from 'lucide-react';

interface EmptyStateProps {
  icon: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message }) => {
  // Dynamically get the icon component from lucide-react
  const IconComponent = (Icons as any)[icon] || Icons.Search;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
        <IconComponent className="w-8 h-8" strokeWidth={1.5} />
      </div>
      <p className="text-gray-500 text-sm max-w-[280px] leading-relaxed font-medium">
        {message}
      </p>
    </div>
  );
};
