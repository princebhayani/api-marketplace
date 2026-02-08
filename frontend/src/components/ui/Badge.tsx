import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
    className?: string;
}

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
    const variants = {
        primary: 'badge-primary',
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        neutral: 'bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300',
    };

    return (
        <span className={cn('badge', variants[variant], className)}>
            {children}
        </span>
    );
}
