"use client";

import { Spinner } from "../ui/Spinner";

export function FullScreenLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-900">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-dark-600 dark:text-dark-400">{message}</p>
      </div>
    </div>
  );
}
