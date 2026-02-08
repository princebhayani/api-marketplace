"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProviderApiLayout } from "@/components/layout/ProviderApiLayout";
import { Spinner } from "@/components/ui/Spinner";
import { fetchProviderApiById } from "@/services/api";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";

export default function ProviderApiWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [api, setApi] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    async function loadBaseApi() {
      if (!id) return;
      try {
        const data = await fetchProviderApiById(id);
        setApi(data);
      } catch (err) {
        toast.error("Failed to load workspace");
        router.replace("/provider/dashboard");
      } finally {
        setApiLoading(false);
      }
    }
    loadBaseApi();
  }, [id, router]);

  return (
    <RequireRole roles={["User", "SuperAdmin"]}>
      {apiLoading ? (
        <div className="min-h-screen flex flex-col bg-white dark:bg-dark-900">
          <Header user={user!} />
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
          <Footer />
        </div>
      ) : !api ? null : (
        <div className="min-h-screen flex flex-col bg-white dark:bg-dark-900">
          <Header user={user!} />
          <ProviderApiLayout api={api}>{children}</ProviderApiLayout>
          <Footer />
        </div>
      )}
    </RequireRole>
  );
}
