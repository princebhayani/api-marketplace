"use client";

import { InvoicesPage } from "@/components/pages/InvoicesPage";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";

export default function InvoicesRoute() {
  const { user } = useAuth();
  return (
    <RequireAuth>
      <InvoicesPage user={user!} />
    </RequireAuth>
  );
}
