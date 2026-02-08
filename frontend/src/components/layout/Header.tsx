import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard, Package, Settings, User as UserIcon, ChevronDown, IndianRupee, Activity } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import type { AuthUser } from '../../contexts/AuthContext';
import { logout } from '../../services/api';
import { cn } from '../../utils/cn';

interface HeaderProps {
    user: AuthUser | null;
    onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            if (onLogout) onLogout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setProfileMenuOpen(false);
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <header className="sticky top-0 z-40 w-full header-bar safe-area-top">
            <nav className="container-custom" aria-label="Main navigation">
                <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] sm:min-w-0 flex-shrink-0 justify-center sm:justify-start group"
                        aria-label="API Marketplace home"
                    >
                        <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm">
                            <span className="text-white font-semibold text-xs tracking-tight">API</span>
                        </div>
                        <span className="hidden sm:inline text-lg font-semibold text-dark-900 dark:text-dark-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            API Marketplace
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {user && (
                            <>
                                <Link
                                    href="/"
                                    className="px-3 py-1.5 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800/50 rounded-lg transition-colors"
                                >
                                    Browse APIs
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="px-3 py-1.5 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800/50 rounded-lg transition-colors"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/invoices"
                                    className="px-3 py-1.5 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800/50 rounded-lg transition-colors"
                                >
                                    Invoices
                                </Link>
                                <Link
                                    href="/activity"
                                    className="px-3 py-1.5 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800/50 rounded-lg transition-colors"
                                >
                                    Activity
                                </Link>
                                {(user.roles.includes('User') || user.roles.includes('SuperAdmin')) && (
                                    <Link
                                        href="/provider/dashboard"
                                        className="px-3 py-1.5 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800/50 rounded-lg transition-colors"
                                    >
                                        Provider
                                    </Link>
                                )}
                                {user.roles.includes('SuperAdmin') && (
                                    <Link
                                        href="/admin/dashboard"
                                        className="px-3 py-1.5 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-dark-50 dark:hover:bg-dark-800/50 rounded-lg transition-colors"
                                    >
                                        Admin
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                    {/* Right side actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggle />

                        {user ? (
                            <>
                                {/* Desktop profile dropdown */}
                                <div className="hidden md:block relative">
                                    <button
                                        type="button"
                                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                        aria-expanded={profileMenuOpen}
                                        aria-haspopup="true"
                                        aria-controls="profile-menu"
                                        id="profile-menu-button"
                                        className="flex items-center gap-2 min-h-[var(--touch-target-min)] p-1.5 px-2.5 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors border border-transparent hover:border-dark-200 dark:hover:border-dark-700"
                                    >
                                        <div className="w-7 h-7 rounded-md bg-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                        </div>
                                        <div className="text-left hidden lg:block">
                                            <p className="text-sm font-medium text-dark-900 dark:text-dark-50 truncate max-w-[120px]">
                                                {user.name || user.email.split("@")[0]}
                                            </p>
                                            <p className="text-[11px] text-dark-500 dark:text-dark-400 truncate max-w-[120px]">
                                                {user.email}
                                            </p>
                                        </div>
                                        <ChevronDown className={cn('w-3.5 h-3.5 text-dark-400 transition-transform duration-200', profileMenuOpen && 'rotate-180')} />
                                    </button>

                                    {profileMenuOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setProfileMenuOpen(false)}
                                                aria-hidden="true"
                                            />
                                            <div
                                                id="profile-menu"
                                                role="menu"
                                                aria-labelledby="profile-menu-button"
                                                className="absolute right-0 mt-1.5 w-56 max-w-[calc(100vw-2rem)] py-1 bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 shadow-lg shadow-dark-900/5 dark:shadow-dark-950/20 z-20 animate-fade-in"
                                            >
                                                {/* Account section header */}
                                                <div className="px-3 py-2 border-b border-dark-100 dark:border-dark-800">
                                                    <p className="text-xs font-medium text-dark-400 dark:text-dark-500 uppercase tracking-wider">
                                                        Account
                                                    </p>
                                                </div>

                                                <div className="py-1">
                                                    <Link
                                                        href="/profile"
                                                        role="menuitem"
                                                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors"
                                                        onClick={() => setProfileMenuOpen(false)}
                                                    >
                                                        <UserIcon className="w-4 h-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                                        My Profile
                                                    </Link>
                                                    <Link
                                                        href="/dashboard"
                                                        role="menuitem"
                                                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors"
                                                        onClick={() => setProfileMenuOpen(false)}
                                                    >
                                                        <LayoutDashboard className="w-4 h-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                                        Dashboard
                                                    </Link>
                                                    <Link
                                                        href="/invoices"
                                                        role="menuitem"
                                                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors"
                                                        onClick={() => setProfileMenuOpen(false)}
                                                    >
                                                        <IndianRupee className="w-4 h-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                                        Invoices
                                                    </Link>
                                                    <Link
                                                        href="/activity"
                                                        role="menuitem"
                                                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors"
                                                        onClick={() => setProfileMenuOpen(false)}
                                                    >
                                                        <Activity className="w-4 h-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                                        Activity
                                                    </Link>
                                                </div>
                                                {(user.roles.includes('User') || user.roles.includes('SuperAdmin')) && (
                                                    <>
                                                        <div className="h-px bg-dark-100 dark:bg-dark-800" />
                                                        <div className="py-1">
                                                            <Link
                                                                href="/provider/dashboard"
                                                                role="menuitem"
                                                                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors"
                                                                onClick={() => setProfileMenuOpen(false)}
                                                            >
                                                                <Package className="w-4 h-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                                                Provider Dashboard
                                                            </Link>
                                                        </div>
                                                    </>
                                                )}

                                                {user.roles.includes('SuperAdmin') && (
                                                    <>
                                                        <div className="h-px bg-dark-100 dark:bg-dark-800" />
                                                        <div className="py-1">
                                                            <Link
                                                                href="/admin/dashboard"
                                                                role="menuitem"
                                                                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800/60 transition-colors"
                                                                onClick={() => setProfileMenuOpen(false)}
                                                            >
                                                                <Settings className="w-4 h-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                                                Admin Panel
                                                            </Link>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="h-px bg-dark-100 dark:bg-dark-800" />
                                                <div className="py-1">
                                                    <button
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setProfileMenuOpen(false);
                                                            handleLogout();
                                                        }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/10 transition-colors"
                                                    >
                                                        <LogOut className="w-4 h-4 flex-shrink-0" aria-hidden />
                                                        Logout
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Mobile menu button */}
                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    className="md:hidden min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] p-2 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors flex items-center justify-center"
                                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                    aria-expanded={mobileMenuOpen}
                                    aria-controls="mobile-nav-menu"
                                >
                                    {mobileMenuOpen ? (
                                        <X className="h-5 w-5 flex-shrink-0 text-dark-600 dark:text-dark-300" aria-hidden />
                                    ) : (
                                        <Menu className="h-5 w-5 flex-shrink-0 text-dark-600 dark:text-dark-300" aria-hidden />
                                    )}
                                </button>
                            </>
                        ) : (
                            <div className="hidden md:flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push('/login')}
                                    aria-label="Log in"
                                >
                                    Login
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => router.push('/register')}
                                    aria-label="Sign up"
                                >
                                    Sign Up
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                {/* Mobile menu */}
                <div
                    id="mobile-nav-menu"
                    className={cn(
                        'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
                        mobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
                    )}
                    aria-hidden={!mobileMenuOpen}
                >
                    {mobileMenuOpen && user && (
                        <div className="py-3 border-t border-dark-200/60 dark:border-dark-800/60">
                            <div className="flex flex-col gap-0.5">
                                {/* Mobile user info */}
                                <div className="flex items-center gap-3 px-3 py-3 mb-2">
                                    <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-dark-900 dark:text-dark-50 truncate">
                                            {user.name || user.email.split("@")[0]}
                                        </p>
                                        <p className="text-xs text-dark-500 dark:text-dark-400 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Navigation section label */}
                                <div className="px-3 pb-1">
                                    <p className="text-[11px] font-medium text-dark-400 dark:text-dark-500 uppercase tracking-wider">
                                        Navigation
                                    </p>
                                </div>

                                <Link
                                    href="/"
                                    className="flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Package className="h-4 w-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Browse APIs</span>
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <LayoutDashboard className="h-4 w-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Dashboard</span>
                                </Link>
                                <Link
                                    href="/invoices"
                                    className="flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <IndianRupee className="h-4 w-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Invoices</span>
                                </Link>
                                <Link
                                    href="/activity"
                                    className="flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Activity className="h-4 w-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                    <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Activity</span>
                                </Link>
                                {(user.roles.includes('User') || user.roles.includes('SuperAdmin')) && (
                                    <Link
                                        href="/provider/dashboard"
                                        className="flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Package className="h-4 w-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                        <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Provider Dashboard</span>
                                    </Link>
                                )}

                                {user.roles.includes('SuperAdmin') && (
                                    <Link
                                        href="/admin/dashboard"
                                        className="flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Settings className="h-4 w-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                        <span className="text-sm font-medium text-dark-700 dark:text-dark-300">Admin Panel</span>
                                    </Link>
                                )}

                                {/* Account section */}
                                <div className="mt-2 pt-2 border-t border-dark-100 dark:border-dark-800">
                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <UserIcon className="h-4 w-4 flex-shrink-0 text-dark-400 dark:text-dark-500" aria-hidden />
                                        <span className="text-sm font-medium text-dark-700 dark:text-dark-300">My Profile</span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-2.5 mx-2 px-2.5 py-2.5 min-h-[var(--touch-target-min)] rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/10 transition-colors text-left"
                                    >
                                        <LogOut className="h-4 w-4 flex-shrink-0 text-danger-500" aria-hidden />
                                        <span className="text-sm font-medium text-danger-600 dark:text-danger-400">Logout</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Mobile: logged out state */}
                    {mobileMenuOpen && !user && (
                        <div className="py-4 border-t border-dark-200/60 dark:border-dark-800/60 flex flex-col gap-2 px-2">
                            <Button
                                variant="ghost"
                                size="md"
                                className="w-full justify-center min-h-[var(--touch-target-min)]"
                                onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}
                            >
                                Login
                            </Button>
                            <Button
                                variant="primary"
                                size="md"
                                className="w-full justify-center min-h-[var(--touch-target-min)]"
                                onClick={() => { setMobileMenuOpen(false); router.push('/register'); }}
                            >
                                Sign Up
                            </Button>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}
