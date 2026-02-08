import { cn } from '../../utils/cn';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  lines?: number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClass = 'skeleton animate-pulse';

  if (variant === 'circular') {
    return (
      <div
        className={cn(baseClass, 'rounded-full', className)}
        style={{ width: width ?? '2.5rem', height: height ?? '2.5rem' }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(baseClass, 'rounded-xl', className)}
        style={{ width: width ?? '100%', height: height ?? '8rem' }}
      />
    );
  }

  // Text variant - renders multiple lines
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClass, 'rounded h-4', className)}
            style={{
              width: i === lines - 1 ? '60%' : width ?? '100%',
              height: height ?? '1rem',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClass, 'rounded', className)}
      style={{ width: width ?? '100%', height: height ?? '1rem' }}
    />
  );
}

// Pre-built skeleton compositions for common patterns
export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton variant="rectangular" width="3rem" height="3rem" className="rounded-xl" />
        <Skeleton width="4rem" height="1rem" />
      </div>
      <Skeleton height="1.25rem" width="70%" />
      <Skeleton variant="text" lines={2} />
      <div className="pt-4 border-t border-dark-100 dark:border-dark-800">
        <div className="flex justify-between">
          <Skeleton width="5rem" />
          <Skeleton width="4rem" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
          <div className="flex-1 space-y-2">
            <Skeleton height="1rem" width="40%" />
            <Skeleton height="0.75rem" width="70%" />
          </div>
          <Skeleton width="4rem" height="1.5rem" className="rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-6 flex items-center gap-4">
          <Skeleton variant="rectangular" width="3rem" height="3rem" className="rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton height="0.75rem" width="60%" />
            <Skeleton height="1.5rem" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}
