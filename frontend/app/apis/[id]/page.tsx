"use client";

import { useParams } from "next/navigation";
import { ApiDetailPage } from "@/components/pages/ApiDetailPage";
import { useAuth } from "@/contexts/AuthContext";

export default function ApiDetailRoute() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();

  if (!params?.id) return null;

  return <ApiDetailPage user={user} />;
}
