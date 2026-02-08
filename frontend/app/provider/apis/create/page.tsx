"use client";

import { CreateApiPage } from "@/components/pages/CreateApiPage";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";

export default function ProviderCreateApiRoute() {
  const { user } = useAuth();
  return (
    <RequireRole roles={["User", "SuperAdmin"]}>
      <CreateApiPage user={user!} />
    </RequireRole>
  );
}
