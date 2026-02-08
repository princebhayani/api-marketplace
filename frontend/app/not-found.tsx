import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-dark-950 px-4 py-8 min-w-0">
      <div className="text-center max-w-md w-full min-w-0">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-dark-900 dark:text-dark-50 mb-2" aria-label="Error 404">404</h1>
        <p className="text-base sm:text-lg text-dark-600 dark:text-dark-400 mb-6 sm:mb-8 break-words">
          This page could not be found.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[var(--touch-target-min)] px-6 py-3 rounded-xl font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Go home
          </Link>
          <Link
            href="/apis"
            className="inline-flex items-center justify-center min-h-[var(--touch-target-min)] px-6 py-3 rounded-xl font-medium bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Browse APIs
          </Link>
        </div>
      </div>
    </div>
  );
}
