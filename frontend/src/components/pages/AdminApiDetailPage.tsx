"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonStats, SkeletonCard } from "@/components/ui/Skeleton";
import {
  getAdminApiById,
  approveApi,
  rejectApi,
  publishApi,
  suspendApi,
  activateApi,
  changeApiStatus,
} from "@/services/api";
import { renderMarkdown } from "@/utils/markdown";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Info,
  PauseCircle,
  PlayCircle,
  Shield,
  User,
  XCircle,
  Zap,
  IndianRupee,
  Settings2,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
  user: AuthUser;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: "Draft", color: "bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300 border-dark-200 dark:border-dark-600", icon: FileText },
  REVIEW: { label: "In Review", color: "bg-warning-50 text-warning-600 dark:bg-warning-900/20 dark:text-warning-400 border-warning-200 dark:border-warning-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 border-primary-200 dark:border-primary-700", icon: CheckCircle2 },
  LIVE: { label: "Live", color: "bg-success-50 text-success-600 dark:bg-success-900/20 dark:text-success-400 border-success-200 dark:border-success-700", icon: Globe },
  SUSPENDED: { label: "Suspended", color: "bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400 border-danger-200 dark:border-danger-700", icon: PauseCircle },
};

export function AdminApiDetailPage({ user }: Props) {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : rawId?.[0];
  const router = useRouter();
  const [api, setApi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      router.replace("/admin/dashboard");
      return;
    }
    const apiId = id;
    async function load() {
      try {
        const data = await getAdminApiById(apiId);
        setApi(data);
        setSelectedStatus(data.status);
      } catch (err) {
        toast.error("Failed to load API details");
        router.replace("/admin/dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const handleAction = async (action: string) => {
    if (!id) return;
    setActionLoading(action);
    try {
      switch (action) {
        case "approve":
          await approveApi(id);
          break;
        case "reject":
          await rejectApi(id);
          break;
        case "publish":
          await publishApi(id);
          break;
        case "suspend":
          await suspendApi(id);
          break;
        case "activate":
          await activateApi(id);
          break;
      }
      toast.success(`API ${action}ed successfully`);
      const data = await getAdminApiById(id);
      setApi(data);
      setSelectedStatus(data.status);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async () => {
    if (!id || !selectedStatus || selectedStatus === api?.status) return;
    setStatusUpdateLoading(true);
    try {
      const updated = await changeApiStatus(id, selectedStatus as "DRAFT" | "REVIEW" | "APPROVED" | "LIVE" | "SUSPENDED");
      setApi(updated);
      setSelectedStatus(updated.status);
      toast.success(`Status updated to ${updated.status}`);
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg || "Failed to update status");
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
        <Header user={user} />
        <PageContainer className="flex-1 py-10">
          <SkeletonStats count={3} />
          <div className="mt-6 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  if (!api) return null;

  const sc = STATUS_CONFIG[api.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
      <Header user={user} />
      <PageContainer className="flex-1 py-10">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/admin/dashboard")}
            className="mb-4 text-dark-600 dark:text-dark-400 hover:text-primary-500"
          >
            Back to Admin Dashboard
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center border border-primary-200 dark:border-primary-800">
                <Box className="w-7 h-7 text-primary-500" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-3xl font-semibold text-dark-900 dark:text-dark-50">{api.name}</h1>
                  <Badge className={cn("flex items-center gap-1.5 border py-0.5 px-3 rounded-full text-xs font-bold", sc.color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {sc.label}
                  </Badge>
                </div>
                <p className="text-dark-500 dark:text-dark-400 text-sm font-medium">
                  by {api.provider?.displayName || "Unknown"} • {api.category || "Uncategorized"}
                </p>
                {api.provider?.user && (
                  <p className="text-xs text-dark-400 dark:text-dark-500 mt-1 font-mono">
                    {api.provider.user.email} {api.provider.user.name && `• ${api.provider.user.name}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {api.status === "REVIEW" && (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleAction("approve")}
                    isLoading={actionLoading === "approve"}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    className="text-danger-500 border-danger-200 dark:border-danger-800 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() => handleAction("reject")}
                    isLoading={actionLoading === "reject"}
                  >
                    Reject
                  </Button>
                </>
              )}
              {api.status === "APPROVED" && (
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<PlayCircle className="w-4 h-4" />}
                  onClick={() => handleAction("publish")}
                  isLoading={actionLoading === "publish"}
                >
                  Publish Live
                </Button>
              )}
              {api.status === "LIVE" && (
                <Button
                  variant="secondary"
                  size="md"
                  className="text-warning-500"
                  leftIcon={<PauseCircle className="w-4 h-4" />}
                  onClick={() => handleAction("suspend")}
                  isLoading={actionLoading === "suspend"}
                >
                  Suspend
                </Button>
              )}
              {api.status === "SUSPENDED" && (
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<PlayCircle className="w-4 h-4" />}
                  onClick={() => handleAction("activate")}
                  isLoading={actionLoading === "activate"}
                >
                  Re-activate
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card padding="lg" className="border border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/10">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary-500" />
              Change status
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-dark-600 dark:text-dark-400">Current:</span>
                <Badge className={cn("flex items-center gap-1.5 border py-0.5 px-3 rounded-full text-xs font-bold", sc.color)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {sc.label}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-600 rounded-xl px-4 py-2.5 text-sm font-bold text-dark-900 dark:text-dark-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="REVIEW">In Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="LIVE">Live</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStatusChange}
                  disabled={selectedStatus === api.status || statusUpdateLoading}
                  isLoading={statusUpdateLoading}
                >
                  Update status
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-500" />
              Core details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
              <DetailRow label="Slug" value={api.slug} mono />
              <DetailRow label="Base URL" value={api.baseUrl} mono />
              <DetailRow label="Category" value={api.category || "—"} />
              <DetailRow label="Auth" value={api.authenticationMethod || "—"} />
              <DetailRow label="Rate limit" value={api.publicRateLimitPerMinute != null ? `${api.publicRateLimitPerMinute} req/min` : (api.rateLimits || "—")} />
              <DetailRow label="Created" value={api.createdAt ? new Date(api.createdAt).toLocaleString() : "—"} />
              <DetailRow label="Updated" value={api.updatedAt ? new Date(api.updatedAt).toLocaleString() : "—"} />
            </div>
            {api.description && (
              <div className="mt-6 pt-6 border-t border-dark-100 dark:border-dark-800">
                <p className="text-xs font-medium text-dark-400 uppercase tracking-widest mb-2">Description</p>
                <p className="text-sm text-dark-700 dark:text-dark-300 whitespace-pre-wrap">{api.description}</p>
              </div>
            )}
          </Card>

          {api.documentation && (
            <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Documentation
              </h2>
              <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-100 dark:border-dark-700 text-sm text-dark-700 dark:text-dark-300 prose dark:prose-invert max-w-none w-full break-words markdown-new-styling">
                {renderMarkdown(api.documentation)}
              </div>
            </Card>
          )}

          {api.rateLimits && !api.publicRateLimitPerMinute && (
            <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-500" />
                Rate limits
              </h2>
              <p className="text-sm text-dark-700 dark:text-dark-300">{api.rateLimits}</p>
            </Card>
          )}

          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-6 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-success-500" />
              Pricing plans ({api.plans?.length ?? 0})
            </h2>
            {api.plans?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {api.plans.map((plan: any) => (
                  <div
                    key={plan.id}
                    className="p-5 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-100 dark:border-dark-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-dark-900 dark:text-dark-50">{plan.name}</span>
                      <Badge variant="neutral" className="text-xs font-bold uppercase">
                        {plan.billingType}
                      </Badge>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-dark-500 dark:text-dark-400 mb-3 line-clamp-2">{plan.description}</p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-semibold text-dark-900 dark:text-dark-50">
                        {plan.freeTier ? "Free" : `₹${((plan.priceMonthly ?? 0) / 100).toFixed(0)}`}
                      </span>
                      {!plan.freeTier && <span className="text-xs text-dark-400">/mo</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs font-bold text-primary-600 dark:text-primary-400">
                      <Zap className="w-3.5 h-3.5" />
                      {plan.monthlyQuota != null ? `${plan.monthlyQuota.toLocaleString()} requests/mo` : "Unlimited"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400 italic">No plans defined.</p>
            )}
          </Card>

          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Provider
            </h2>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs font-medium text-dark-400 uppercase tracking-widest mb-1">Display name</p>
                <p className="font-bold text-dark-900 dark:text-dark-50">{api.provider?.displayName ?? "—"}</p>
              </div>
              {api.provider?.website && (
                <div>
                  <p className="text-xs font-medium text-dark-400 uppercase tracking-widest mb-1">Website</p>
                  <a
                    href={api.provider.website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm text-primary-500 hover:underline"
                  >
                    {api.provider.website}
                  </a>
                </div>
              )}
              {api.provider?.user?.email && (
                <div>
                  <p className="text-xs font-medium text-dark-400 uppercase tracking-widest mb-1">Email</p>
                  <p className="font-mono text-sm text-dark-700 dark:text-dark-300">{api.provider.user.email}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-dark-400 uppercase tracking-widest mb-1">{label}</p>
      <p
        className={cn(
          "text-sm font-bold text-dark-800 dark:text-dark-300 break-all",
          mono && "font-mono bg-dark-50 dark:bg-dark-800 px-2 py-1 rounded text-xs"
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}
