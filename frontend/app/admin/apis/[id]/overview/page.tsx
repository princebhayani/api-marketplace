"use client";

import { AdminApiDetailPage } from "@/components/pages/AdminApiDetailPage";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminApiDetailOverviewRoute() {
  const { user } = useAuth();
  return (
    <RequireRole roles={["SuperAdmin"]}>
      <AdminApiDetailPage user={user!} />
    </RequireRole>
  );
}
