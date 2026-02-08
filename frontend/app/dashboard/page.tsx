"use client";

import { DashboardPage } from "@/components/pages/DashboardPage";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardRoute() {
  const { user } = useAuth();
  return (
    <RequireAuth>
      <DashboardPage user={user!} />
    </RequireAuth>
  );
}
