"use client";

import { ProviderDashboardPage } from "@/components/pages/ProviderDashboardPage";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";

export default function ProviderDashboardRoute() {
  const { user } = useAuth();
  return (
    <RequireRole roles={["User", "SuperAdmin"]}>
      <ProviderDashboardPage user={user!} />
    </RequireRole>
  );
}
