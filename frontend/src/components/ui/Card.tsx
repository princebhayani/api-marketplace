import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'hover' | 'interactive';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            variant = 'default',
            padding = 'md',
            children,
            ...props
        },
        ref
    ) => {
        const variants = {
            default: 'card',
            hover: 'card-hover',
            interactive: 'card-interactive',
        };

        const paddings = {
            none: '',
            sm: 'p-4 sm:p-4',
            md: 'p-4 sm:p-6',
            lg: 'p-6 sm:p-8',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    variants[variant],
                    paddings[padding],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';
