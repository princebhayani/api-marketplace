"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "./FullScreenLoader";

export function RequireRole({
  roles,
  children,
  redirectTo = "/",
  unauthenticatedRedirectTo = "/login",
}: {
  roles: string[];
  children: React.ReactNode;
  redirectTo?: string;
  unauthenticatedRedirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(unauthenticatedRedirectTo);
      return;
    }
    const ok = roles.some((r) => user.roles.includes(r));
    if (!ok) router.replace(redirectTo);
  }, [loading, user, roles, router, redirectTo, unauthenticatedRedirectTo]);

  if (loading) return <FullScreenLoader />;
  if (!user) return null;
  const ok = roles.some((r) => user.roles.includes(r));
  if (!ok) return null;
  return <>{children}</>;
}

