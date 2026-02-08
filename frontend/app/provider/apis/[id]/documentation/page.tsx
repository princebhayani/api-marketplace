"use client";

import { DocumentationEditorPage } from "@/components/pages/DocumentationEditorPage";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";

export default function ProviderApiDocsRoute() {
  const { user } = useAuth();
  return (
    <RequireRole roles={["User", "SuperAdmin"]}>
      <DocumentationEditorPage user={user!} />
    </RequireRole>
  );
}
