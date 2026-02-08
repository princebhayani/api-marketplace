"use client";

import { ActivityPage } from "@/components/pages/ActivityPage";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";

export default function ActivityRoute() {
  const { user } = useAuth();
  return (
    <RequireAuth>
      <ActivityPage user={user!} />
    </RequireAuth>
  );
}
