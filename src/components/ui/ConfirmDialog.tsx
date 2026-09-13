import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false
}) => {
  const handleCancel = onCancel || onClose;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={title} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className={`p-3 rounded-full mb-4 ${variant === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
          <AlertTriangle className="w-8 h-8" />
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-sm hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
              variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
