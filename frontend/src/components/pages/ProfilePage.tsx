import { useState } from "react";
import toast from "react-hot-toast";
import { User, Lock, Mail, Save, Key } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateProfile, changePassword } from "@/services/api";
import type { AuthUser } from "@/contexts/AuthContext";

interface Props {
    user: AuthUser;
    onUpdateUser: (user: AuthUser) => void;
}

export function ProfilePage({ user, onUpdateUser }: Props) {
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [name, setName] = useState(user.name || "");
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const updatedUser = await updateProfile({ name });
            onUpdateUser({ ...user, name: updatedUser.name ?? undefined });
            toast.success("Profile updated successfully!");
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("New passwords do not match!");
            return;
        }
        setPasswordLoading(true);
        try {
            await changePassword({
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });
            setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
            toast.success("Password changed successfully!");
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950 min-w-0">
            <Header user={user} />
            <PageContainer className="flex-1 py-8 sm:py-12">
                <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 min-w-0">
                    <div className="space-y-2 min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-semibold text-dark-900 dark:text-dark-50 tracking-tight break-words">
                            Account Settings
                        </h1>
                        <p className="text-dark-600 dark:text-dark-400 text-base break-words">
                            Manage your personal information and security preferences.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 min-w-0">
                        {/* Sidebar/Profile Card */}
                        <div className="lg:col-span-4 space-y-4 sm:space-y-6 min-w-0">
                            <Card className="text-center p-6 sm:p-8 space-y-4 sm:space-y-6 overflow-hidden">
                                <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl sm:text-4xl font-semibold flex-shrink-0">
                                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <h3 className="text-lg sm:text-xl font-semibold text-dark-900 dark:text-dark-50 truncate">
                                        {user.name || user.email.split("@")[0]}
                                    </h3>
                                    <p className="text-dark-500 dark:text-dark-400 text-sm flex items-center justify-center gap-2 break-all">
                                        <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                                        {user.email}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-dark-100 dark:border-dark-800 flex flex-wrap justify-center gap-2">
                                    {user.roles.map(role => (
                                        <span key={role} className="px-3 py-1 rounded-full bg-dark-100 dark:bg-dark-800 text-xs font-medium text-dark-600 dark:text-dark-300 uppercase tracking-wider border border-dark-200 dark:border-dark-700">
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Forms */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Personal Info */}
                            <Card padding="lg" className="space-y-6 bg-white dark:bg-dark-900">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                                        <User className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">Personal Information</h2>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-1.5 opacity-60">
                                            <label className="label">Email Address</label>
                                            <div className="input flex items-center gap-3 bg-dark-50 dark:bg-dark-900 border-dark-100 dark:border-dark-800 cursor-not-allowed">
                                                <Mail className="w-4 h-4 text-dark-400" />
                                                <span className="text-dark-600 dark:text-dark-400 font-medium">
                                                    {user.email}
                                                </span>
                                            </div>
                                            <p className="text-xs text-dark-400 font-medium ml-1">
                                                Email cannot be changed
                                            </p>
                                        </div>

                                        <Input
                                            label="Full Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your full name"
                                            leftIcon={<User className="w-4 h-4" />}
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={profileLoading}
                                            leftIcon={<Save className="w-4 h-4" />}
                                            className="px-8"
                                        >
                                            Update Profile
                                        </Button>
                                    </div>
                                </form>
                            </Card>

                            {/* Security / Password */}
                            <Card padding="lg" className="space-y-6 bg-white dark:bg-dark-900">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
                                        <Lock className="w-5 h-5 text-warning-500" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">Security</h2>
                                </div>

                                <form onSubmit={handleChangePassword} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <Input
                                                label="Current Password"
                                                type="password"
                                                value={passwords.currentPassword}
                                                onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                                                placeholder="••••••••"
                                                leftIcon={<Key className="w-4 h-4" />}
                                                required
                                            />
                                        </div>
                                        <Input
                                            label="New Password"
                                            type="password"
                                            value={passwords.newPassword}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                                            placeholder="Minimum 8 characters"
                                            leftIcon={<Lock className="w-4 h-4" />}
                                            required
                                        />
                                        <Input
                                            label="Confirm New Password"
                                            type="password"
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            placeholder="Repeat new password"
                                            leftIcon={<Lock className="w-4 h-4" />}
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={passwordLoading}
                                            leftIcon={<Lock className="w-4 h-4" />}
                                            className="px-8"
                                        >
                                            Change Password
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    </div>
                </div>
            </PageContainer>
            <Footer />
        </div>
    );
}
