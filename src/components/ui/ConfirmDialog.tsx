import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
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
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 py-3"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            loading={isLoading}
            className="flex-1 py-3"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
