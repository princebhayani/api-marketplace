import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn(
                'min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] p-2 rounded-lg flex items-center justify-center',
                'bg-dark-100 dark:bg-dark-800',
                'hover:bg-dark-200 dark:hover:bg-dark-700',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                className
            )}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon className="h-5 w-5 flex-shrink-0 text-dark-700 dark:text-dark-300" aria-hidden />
            ) : (
                <Sun className="h-5 w-5 flex-shrink-0 text-dark-700 dark:text-dark-300" aria-hidden />
            )}
        </button>
    );
}
