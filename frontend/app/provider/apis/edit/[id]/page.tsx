"use client";

import { useParams } from "next/navigation";
import { EditApiPage } from "@/components/pages/EditApiPage";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";

export default function ProviderEditApiRoute() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  if (!params?.id) return null;

  return (
    <RequireRole roles={["User", "SuperAdmin"]}>
      <EditApiPage user={user!} />
    </RequireRole>
  );
}
