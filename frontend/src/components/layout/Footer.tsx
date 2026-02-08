import React from 'react';
import Link from "next/link";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto border-t border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-950 safe-area-bottom" role="contentinfo">
            <div className="container-custom">
                <div className="py-8 sm:py-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                        {/* Brand */}
                        <div className="max-w-sm">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-primary-600 flex items-center justify-center">
                                    <span className="text-white font-semibold text-xs">API</span>
                                </div>
                                <span className="font-semibold text-lg text-dark-900 dark:text-dark-50">
                                    API Marketplace
                                </span>
                            </div>
                            <p className="text-sm text-dark-500 dark:text-dark-400 leading-relaxed">
                                Discover, integrate, and manage APIs. A modern marketplace for developers and businesses.
                            </p>
                        </div>

                        {/* Links */}
                        <div className="flex gap-12">
                            <div>
                                <h3 className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-3">
                                    Platform
                                </h3>
                                <ul className="space-y-2">
                                    <li>
                                        <Link
                                            href="/"
                                            className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                        >
                                            Browse APIs
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/dashboard"
                                            className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                        >
                                            Dashboard
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/provider/dashboard"
                                            className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                        >
                                            For Providers
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-3">
                                    Account
                                </h3>
                                <ul className="space-y-2">
                                    <li>
                                        <Link
                                            href="/profile"
                                            className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                        >
                                            Profile
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/invoices"
                                            className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                        >
                                            Invoices
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/activity"
                                            className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                        >
                                            Activity
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="py-4 border-t border-dark-100 dark:border-dark-800">
                    <p className="text-xs text-dark-400 dark:text-dark-500 text-center sm:text-left">
                        &copy; {currentYear} API Marketplace. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
