import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const icons = {
    danger: <Trash2 className="w-6 h-6 text-danger-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning-500" />,
    primary: <Info className="w-6 h-6 text-primary-500" />,
  };

  const iconBg = {
    danger: 'bg-danger-50 dark:bg-danger-900/20',
    warning: 'bg-warning-50 dark:bg-warning-900/20',
    primary: 'bg-primary-50 dark:bg-primary-900/20',
  };

  const buttonVariant = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    primary: 'primary' as const,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center sm:text-left">
        <div className={`w-12 h-12 rounded-xl ${iconBg[variant]} flex items-center justify-center mx-auto sm:mx-0 mb-4`}>
          {icons[variant]}
        </div>
        <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">
          {title}
        </h3>
        <p className="text-sm text-dark-600 dark:text-dark-400 mb-6">
          {message}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={buttonVariant[variant]} size="md" onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
