import React from 'react';
import { cn } from '../../utils/cn';

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
    return (
        <main className={cn('container-custom py-6 sm:py-8 min-w-0', className)}>
            {children}
        </main>
    );
}
