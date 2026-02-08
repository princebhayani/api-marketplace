"use client";

import { ApiListPage } from "@/components/pages/ApiListPage";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user } = useAuth();
  return <ApiListPage user={user} />;
}
