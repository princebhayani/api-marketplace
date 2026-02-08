"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SkeletonStats, SkeletonList } from "@/components/ui/Skeleton";
import { getAdminApis, changeApiStatus } from "@/services/api";
import { cn } from "@/utils/cn";
import {
  Search,
  Filter,
  Globe,
  PauseCircle,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Package,
  User,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeVariant: "success" | "warning" | "danger" | "neutral"; pillClass: string; icon: typeof Clock }
> = {
  DRAFT: {
    label: "Draft",
    badgeVariant: "neutral",
    pillClass:
      "bg-dark-50 text-dark-600 dark:bg-dark-800 dark:text-dark-200 border-dark-100 dark:border-dark-700",
    icon: FileText,
  },
  REVIEW: {
    label: "In review",
    badgeVariant: "warning",
    pillClass:
      "bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-300 border-warning-200 dark:border-warning-800",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    badgeVariant: "success",
    pillClass:
      "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300 border-primary-200 dark:border-primary-800",
    icon: CheckCircle2,
  },
  LIVE: {
    label: "Live",
    badgeVariant: "success",
    pillClass:
      "bg-success-50 text-success-700 dark:bg-success-900/15 dark:text-success-300 border-success-200 dark:border-success-800",
    icon: Globe,
  },
  SUSPENDED: {
    label: "Suspended",
    badgeVariant: "danger",
    pillClass:
      "bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-300 border-danger-200 dark:border-danger-800",
    icon: PauseCircle,
  },
};

const STATUS_OPTIONS = ["ALL", "DRAFT", "REVIEW", "APPROVED", "LIVE", "SUSPENDED"] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];

export default function AdminApisListRoute() {
  const { user } = useAuth();

  return (
    <RequireRole roles={["SuperAdmin"]}>
      <AdminApisPage userEmail={user?.email ?? ""} />
    </RequireRole>
  );
}

interface AdminApisPageProps {
  userEmail: string;
}

function AdminApisPage({ userEmail }: AdminApisPageProps) {
  const router = useRouter();
  const [apis, setApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    void loadApis();
  }, [statusFilter]);

  async function loadApis(showToast = false, overrideStatus?: StatusFilter) {
    const status = overrideStatus ?? statusFilter;
    try {
      const data = await getAdminApis(status === "ALL" ? undefined : status);
      setApis(data);
      if (showToast) toast.success("APIs refreshed");
    } catch (err) {
      toast.error("Failed to load APIs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredApis = useMemo(() => {
    const term = search.trim().toLowerCase();
    return apis.filter((api) => {
      const matchesSearch =
        !term ||
        api.name?.toLowerCase().includes(term) ||
        api.slug?.toLowerCase().includes(term) ||
        api.provider?.displayName?.toLowerCase().includes(term) ||
        api.provider?.user?.email?.toLowerCase().includes(term);
      return matchesSearch;
    });
  }, [apis, search]);

  async function handleStatusChange(apiId: string, newStatus: string) {
    if (!newStatus) return;
    setUpdatingStatusId(apiId);
    try {
      const updated = await changeApiStatus(
        apiId,
        newStatus as "DRAFT" | "REVIEW" | "APPROVED" | "LIVE" | "SUSPENDED"
      );
      setApis((prev) => prev.map((a) => (a.id === apiId ? updated : a)));
      toast.success(`Status updated to ${updated.status}`);
    } catch (err) {
      toast.error((err as Error).message || "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  const hasAnyApis = apis.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
        <Header user={{ email: userEmail, id: "", roles: ["SuperAdmin"] }} />
        <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
          <SkeletonStats count={4} />
          <div className="mt-6">
            <SkeletonList />
          </div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950 min-w-0">
      <Header user={{ email: userEmail, id: "", roles: ["SuperAdmin"] }} />

      <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 mb-1">
              Admin workspace
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2 break-words">
              API moderation
            </h1>
            <p className="text-sm text-dark-500 dark:text-dark-400 mt-2 max-w-2xl break-words">
              Review submitted APIs, approve or reject them, and keep your marketplace clean and
              high quality.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                void loadApis(true);
              }}
              isLoading={refreshing}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 min-w-0">
          <Card padding="lg" className="lg:col-span-1 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <Package className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-dark-400 mb-1">
                Total APIs
              </p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
                {apis.length.toString()}
              </p>
            </div>
          </Card>

          <Card padding="lg" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-900/20">
              <AlertTriangle className="w-6 h-6 text-warning-500" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-dark-400 mb-1">
                In review
              </p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
                {apis.filter((a) => a.status === "REVIEW").length}
              </p>
            </div>
          </Card>

          <Card padding="lg" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success-50 dark:bg-success-900/20">
              <Globe className="w-6 h-6 text-success-500" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-dark-400 mb-1">
                Live
              </p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
                {apis.filter((a) => a.status === "LIVE").length}
              </p>
            </div>
          </Card>

          <Card padding="lg" className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800">
              <User className="w-6 h-6 text-dark-500 dark:text-dark-200" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-dark-400 mb-1">
                Admin
              </p>
              <p className="text-xs font-mono text-dark-700 dark:text-dark-300 truncate max-w-[180px]">
                {userEmail || "superadmin"}
              </p>
            </div>
          </Card>
        </div>

        <Card padding="lg" className="mb-4 sm:mb-6 border border-dark-100 dark:border-dark-800 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between min-w-0">
            <div className="flex-1 flex items-center gap-3 min-w-0 w-full">
              <div className="relative flex-1 min-w-0 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 flex-shrink-0 pointer-events-none" aria-hidden />
                <input
                  placeholder="Search by name, slug, provider or email..."
                  className="w-full min-w-0 pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-dark-900 border border-dark-100 dark:border-dark-700 text-sm text-dark-900 dark:text-dark-50 focus:ring-2 focus:ring-primary-500 outline-none min-h-[var(--touch-target-min)]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search APIs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-dark-400 flex-shrink-0" aria-hidden />
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setLoading(true);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border transition-all",
                      statusFilter === status
                        ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                        : "bg-white dark:bg-dark-900 text-dark-500 dark:text-dark-300 border-dark-100 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700"
                    )}
                  >
                    {status === "ALL" ? "All" : STATUS_CONFIG[status].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {!hasAnyApis ? (
          <Card className="py-20 text-center border border-dashed border-dark-200 dark:border-dark-800">
            <div className="max-w-md mx-auto">
              <Package className="w-14 h-14 text-dark-200 dark:text-dark-700 mx-auto mb-5" />
              <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-2">
                No APIs found yet
              </h2>
              <p className="text-sm text-dark-500 dark:text-dark-400 mb-4">
                As providers publish APIs, they will appear here for review and moderation.
              </p>
            </div>
          </Card>
        ) : filteredApis.length === 0 ? (
          <Card className="py-16 text-center border border-dashed border-dark-200 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-1">
              No APIs match your filters
            </h2>
            <p className="text-sm text-dark-500 dark:text-dark-400">
              Try clearing the search query or selecting a different status.
            </p>
          </Card>
        ) : (
          <div className="space-y-4 min-w-0">
            {filteredApis.map((api) => {
              const sc = STATUS_CONFIG[api.status] || STATUS_CONFIG.DRAFT;
              const StatusIcon = sc.icon;
              return (
                <Card
                  key={api.id}
                  padding="md"
                  className="border border-dark-100 dark:border-dark-800 hover:border-primary-400/40 dark:hover:border-primary-500/40 transition-all cursor-pointer group min-w-0 overflow-hidden"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("select") || target.closest("button")) return;
                    router.push(`/admin/apis/${api.id}/overview`);
                  }}
                >
                  <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                    <div className="flex-1 min-w-0 flex items-start gap-4">
                      <div className="mt-1 p-3 rounded-xl bg-dark-50 dark:bg-dark-900">
                        <Package className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="font-semibold text-lg text-dark-900 dark:text-dark-50 truncate max-w-xs sm:max-w-md">
                            {api.name}
                          </h2>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border",
                              sc.pillClass
                            )}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-dark-500 dark:text-dark-400 mb-1">
                          {api.slug}
                        </p>
                        <p className="text-xs text-dark-500 dark:text-dark-400 line-clamp-2 mb-2">
                          {api.description || "No description provided."}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-dark-500 dark:text-dark-400">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {api.provider?.displayName || "Unknown provider"}
                          </span>
                          {api.provider?.user?.email && (
                            <span className="font-mono text-xs text-dark-400 dark:text-dark-500">
                              {api.provider.user.email}
                            </span>
                          )}
                          {api.category && (
                            <Badge variant="neutral" className="text-xs px-2 py-0.5 uppercase">
                              {api.category}
                            </Badge>
                          )}
                          <span className="text-xs text-dark-400 dark:text-dark-500">
                            Plans: {api.plans?.length ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 items-stretch sm:items-end lg:items-end">
                      <div className="flex items-center gap-2">
                        <select
                          value={api.status}
                          onChange={(e) => handleStatusChange(api.id, e.target.value)}
                          disabled={updatingStatusId === api.id}
                          className="bg-white dark:bg-dark-900 border border-dark-100 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-bold text-dark-900 dark:text-dark-100 focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="REVIEW">In review</option>
                          <option value="APPROVED">Approved</option>
                          <option value="LIVE">Live</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(`/admin/apis/${api.id}/overview`)}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                      </div>
                      <p className="text-xs text-right text-dark-400 dark:text-dark-500">
                        Updated {api.updatedAt ? new Date(api.updatedAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>

      <Footer />
    </div>
  );
}
