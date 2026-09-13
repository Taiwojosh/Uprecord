import React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { ToastType } from '../../context/ToastContext';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-sky-500" />
  };

  const colors = {
    success: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    error: 'border-rose-100 bg-rose-50 text-rose-900',
    info: 'border-sky-100 bg-sky-50 text-sky-900'
  };

  return (
    <div 
      className={`pointer-events-auto min-w-[320px] max-w-md p-4 rounded-xl border shadow-lg flex items-start gap-3 animate-in slide-in-from-right-full duration-300 ${colors[type]}`}
      role="alert"
    >
      <div className="mt-0.5 shrink-0">
        {icons[type]}
      </div>
      <div className="flex-1 text-sm font-medium leading-relaxed">
        {message}
      </div>
      <button 
        onClick={onClose}
        className="mt-0.5 p-1 rounded-lg hover:bg-black/5 transition-colors text-gray-400 hover:text-gray-600"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
