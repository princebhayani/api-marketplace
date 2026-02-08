"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "./FullScreenLoader";

export function RequireAuth({
  children,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace(redirectTo);
  }, [loading, user, router, redirectTo]);

  if (loading) return <FullScreenLoader />;
  if (!user) return null;
  return <>{children}</>;
}

