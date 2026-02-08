import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
    footer?: React.ReactNode;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    footer,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    const handleTabKey = useCallback((e: KeyboardEvent) => {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstEl) {
                lastEl?.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastEl) {
                firstEl?.focus();
                e.preventDefault();
            }
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
            if (e.key === 'Tab' && isOpen) handleTabKey(e);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handleTabKey]);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                firstFocusable?.focus();
            }, 50);
        } else {
            document.body.style.overflow = 'unset';
            previousFocusRef.current?.focus();
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'sm:max-w-md',
        md: 'sm:max-w-lg',
        lg: 'sm:max-w-2xl',
        xl: 'sm:max-w-4xl',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="presentation"
        >
            <div className="absolute inset-0 bg-dark-900/60 dark:bg-black/70 backdrop-blur-sm" aria-hidden />

            <div
                ref={modalRef}
                className={cn(
                    'relative w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-scale-in',
                    'bg-white dark:bg-dark-900',
                    'rounded-t-xl sm:rounded-xl shadow-xl-light',
                    'border border-dark-200 dark:border-dark-800',
                    'max-w-[min(100vw,24rem)] sm:max-w-none',
                    sizes[size]
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-dark-100 dark:border-dark-800 flex-shrink-0">
                        {title && (
                            <h2
                                id="modal-title"
                                className="text-base font-semibold text-dark-900 dark:text-dark-50 truncate min-w-0"
                            >
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="ml-auto p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors flex items-center justify-center flex-shrink-0 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300"
                                aria-label="Close modal"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                <div className="px-5 py-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
                    {children}
                </div>

                {footer && (
                    <div className="px-5 py-3 border-t border-dark-100 dark:border-dark-800 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
