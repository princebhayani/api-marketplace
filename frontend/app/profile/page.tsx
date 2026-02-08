"use client";

import { ProfilePage } from "@/components/pages/ProfilePage";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileRoute() {
  const { user, setUser } = useAuth();
  return (
    <RequireAuth>
      <ProfilePage user={user!} onUpdateUser={(u) => setUser(u)} />
    </RequireAuth>
  );
}
