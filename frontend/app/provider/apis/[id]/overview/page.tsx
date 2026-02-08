"use client";

import { ProviderApiViewPage } from "@/components/pages/ProviderApiViewPage";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";

export default function ProviderApiOverviewRoute() {
  const { user } = useAuth();
  return (
    <RequireRole roles={["User", "SuperAdmin"]}>
      <ProviderApiViewPage user={user!} />
    </RequireRole>
  );
}
