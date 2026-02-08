"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RegisterPage } from "@/components/pages/RegisterPage";
import { useAuth } from "@/contexts/AuthContext";

function RegisterContent() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? undefined;

  useEffect(() => {
    if (!loading && user) {
      const path = redirect && redirect.startsWith("/") ? redirect : "/";
      router.replace(path);
    }
  }, [loading, user, router, redirect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-900">
        <div className="text-center">
          <div className="spinner h-12 w-12 mx-auto mb-4" />
          <p className="text-dark-600 dark:text-dark-400">Loading...</p>
        </div>
      </div>
    );
  }

  const afterRegisterPath = redirect && redirect.startsWith("/") ? redirect : "/";
  return (
    <RegisterPage
      onRegister={(u) => {
        setUser(u);
        router.replace(afterRegisterPath);
      }}
      redirectUrl={redirect}
    />
  );
}

export default function RegisterRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-900">
          <div className="spinner h-12 w-12" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
