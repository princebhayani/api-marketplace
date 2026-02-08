import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SkeletonCard, SkeletonList } from "@/components/ui/Skeleton";
import {
  ChevronRight,
  Copy,
  FileText,
  Key,
  Package,
  RefreshCw,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import {
  createApiKey,
  listMySubscriptions,
  listKeys,
  regenerateApiKey,
  revokeApiKey,
  deleteApiKey,
  deleteSubscription,
  getDetailedUsageStats,
  listMyInvoices,
} from "@/services/api";
import { cn } from "@/utils/cn";
import { buildGatewayUrl } from "@/utils/gatewayUrl";

interface Props {
  user: AuthUser;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant: "danger" | "warning";
}

interface ApiPlan {
  name: string;
  monthlyQuota?: number | null;
  api?: {
    id: string;
    name: string;
    slug: string;
    category?: string;
  };
}

interface ApiKey {
  id: string;
  key: string;
  isActive: boolean;
}

interface Subscription {
  id: string;
  status: string;
  apiPlan?: ApiPlan;
  apiKeys?: ApiKey[];
}

interface UsageStat {
  subscriptionId: string;
  usage?: { totalRequests?: number };
  plan?: { monthlyQuota?: number };
}

interface Invoice {
  id: string;
  status: string;
  amount: number;
  currency: string;
  apiName?: string | null;
  planName?: string | null;
  createdAt: string;
}

function invoiceStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "PAID": return "success";
    case "PENDING": return "warning";
    case "FAILED":
    case "CANCELLED": return "danger";
    default: return "neutral";
  }
}

export function DashboardPage({ user }: Props) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [detailedUsage, setDetailedUsage] = useState<UsageStat[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [subscriptions, detailed, invoices] = await Promise.all([
        listMySubscriptions().catch(() => []),
        getDetailedUsageStats().catch(() => []),
        listMyInvoices(5).catch(() => []),
      ]);
      setSubs((subscriptions || []).filter((s: Subscription) => s.status === "ACTIVE"));
      setDetailedUsage(detailed || []);
      setRecentInvoices(invoices || []);
    } finally {
      setLoading(false);
    }
  }

  function getUsageForSubscription(subscriptionId: string, monthlyQuota: number | null) {
    const stat = detailedUsage.find((d) => d.subscriptionId === subscriptionId);
    const used = stat?.usage?.totalRequests ?? 0;
    const limit = monthlyQuota ?? stat?.plan?.monthlyQuota ?? null;
    const usedPercent = limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;
    if (limit != null) {
      return { used, limit, usedPercent, label: `${used.toLocaleString()} / ${limit.toLocaleString()} calls` };
    }
    return { used, limit: null, usedPercent: null, label: `${used.toLocaleString()} calls (Unlimited)` };
  }

  async function handleCreateKey(subscriptionId: string) {
    setActionLoading(`create-${subscriptionId}`);
    try {
      await createApiKey(subscriptionId);
      const keys = await listKeys(subscriptionId);
      setSubs((prev) =>
        prev.map((s) => (s.id === subscriptionId ? { ...s, apiKeys: keys } : s))
      );
      toast.success("API key created!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  function handleRegenerateKey(subscriptionId: string, keyId: string) {
    setConfirmState({
      isOpen: true,
      title: "Regenerate API Key",
      message: "Regenerate this API key? The old key will stop working immediately.",
      variant: "warning",
      onConfirm: async () => {
        setConfirmState(null);
        setActionLoading(`regen-${keyId}`);
        try {
          await regenerateApiKey(subscriptionId, keyId);
          const keys = await listKeys(subscriptionId);
          setSubs((prev) =>
            prev.map((s) => (s.id === subscriptionId ? { ...s, apiKeys: keys } : s))
          );
          toast.success("API key regenerated!");
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  function handleDeleteKey(subscriptionId: string, keyId: string) {
    setConfirmState({
      isOpen: true,
      title: "Delete API Key",
      message: "Delete this API key permanently? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        setConfirmState(null);
        setActionLoading(`delete-${keyId}`);
        try {
          await deleteApiKey(subscriptionId, keyId);
          const keys = await listKeys(subscriptionId);
          setSubs((prev) =>
            prev.map((s) => (s.id === subscriptionId ? { ...s, apiKeys: keys } : s))
          );
          toast.success("API key deleted!");
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  function handleDeleteSubscription(subscriptionId: string, apiName: string) {
    setConfirmState({
      isOpen: true,
      title: "Delete Subscription",
      message: `Delete subscription to "${apiName}"? This will revoke all API keys and permanently remove it from your dashboard.`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmState(null);
        setActionLoading(`delete-sub-${subscriptionId}`);
        try {
          await deleteSubscription(subscriptionId);
          setSubs((prev) => prev.filter((s) => s.id !== subscriptionId));
          toast.success("Subscription deleted");
          loadData();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
        <Header user={user} />
        <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
          <div className="mb-6 sm:mb-10">
            <div className="h-8 w-48 bg-dark-100 dark:bg-dark-800 rounded animate-pulse mb-2" />
            <div className="h-5 w-80 bg-dark-100 dark:bg-dark-800 rounded animate-pulse" />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="mt-10">
            <SkeletonList count={3} />
          </div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
      <Header user={user} />

      <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
        <div className="page-header mb-6 sm:mb-10 min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-dark-900 dark:text-dark-50 mb-2 break-words">User Dashboard</h1>
          <p className="text-base sm:text-lg text-dark-600 dark:text-dark-400 break-words">Manage your active subscriptions and access credentials.</p>
        </div>

        <section className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3 break-words">
              <Shield className="text-primary-500 flex-shrink-0" aria-hidden />
              Active Subscriptions
            </h2>
            <Button variant="secondary" size="sm" onClick={() => router.push("/apis")} className="w-full sm:w-auto">
              Browse more APIs
            </Button>
          </div>

          {subs.length === 0 ? (
            <Card className="text-center py-12 sm:py-24 border border-dashed border-dark-200 dark:border-dark-800 px-4">
              <div className="max-w-md mx-auto min-w-0">
                <Zap className="h-12 w-12 sm:h-16 sm:w-16 text-dark-200 dark:text-dark-700 mx-auto mb-4 sm:mb-6 flex-shrink-0" aria-hidden />
                <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50 mb-2 break-words">No Active Subscriptions</h3>
                <p className="text-sm text-dark-500 mb-6 sm:mb-8 break-words">You haven&apos;t subscribed to any APIs yet. Explore the marketplace to find tools for your project.</p>
                <Button variant="primary" size="lg" onClick={() => router.push("/apis")} className="w-full sm:w-auto">Explore Marketplace</Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:gap-8 min-w-0">
              {subs.map((sub) => (
                <Card key={sub.id} padding="none" className="overflow-hidden border border-dark-200 dark:border-dark-800 hover:border-primary-500/20 transition-all min-w-0">
                  <div className="flex flex-col xl:flex-row min-w-0">
                    {/* Subscription Sidebar Info */}
                    <div className="xl:w-80 flex-shrink-0 bg-dark-50/50 dark:bg-dark-950/50 p-4 sm:p-6 lg:p-8 border-b xl:border-b-0 xl:border-r border-dark-200 dark:border-dark-800 min-w-0">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-primary-600 shadow-sm">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-dark-900 dark:text-dark-50 truncate">{sub.apiPlan?.api?.name}</h3>
                          <p className="text-xs font-medium text-dark-400 uppercase tracking-wider">{sub.apiPlan?.api?.category || "API"}</p>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <DetailRow label="Plan" value={sub.apiPlan?.name ?? "-"} />
                        {(() => {
                          const usage = getUsageForSubscription(sub.id, sub.apiPlan?.monthlyQuota ?? null);
                          return (
                            <div>
                              <p className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1">Quota</p>
                              <p className="text-xs font-semibold text-dark-700 dark:text-dark-300">{usage.label}</p>
                              {usage.usedPercent != null && (
                                <div className="mt-1.5 h-1.5 w-full rounded-full bg-dark-200 dark:bg-dark-700 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      usage.usedPercent >= 90 ? "bg-danger-500" : usage.usedPercent >= 70 ? "bg-warning-500" : "bg-primary-500"
                                    )}
                                    style={{ width: `${usage.usedPercent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div>
                          <p className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1">Request URL</p>
                          <div className="flex items-center gap-2 text-xs font-mono bg-white dark:bg-dark-950 px-2 py-1 rounded-lg border border-dark-200 dark:border-dark-800">
                            <span className="flex-1 min-w-0 truncate text-dark-700 dark:text-dark-300">{buildGatewayUrl(sub.apiPlan?.api?.slug ?? "")}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const url = buildGatewayUrl(sub.apiPlan?.api?.slug ?? "");
                                if (!url) return;
                                navigator.clipboard.writeText(url);
                                toast.success("Request URL copied!");
                              }}
                              className="p-1 hover:bg-dark-50 dark:hover:bg-dark-800 rounded text-dark-400 hover:text-dark-900 dark:hover:text-dark-200 transition-all flex-shrink-0"
                              title="Copy request URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/apis/${sub.apiPlan?.api?.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-dark-950 border border-dark-200 dark:border-dark-800 hover:text-primary-600 transition-all text-xs font-semibold uppercase tracking-wider">
                          API Details <ChevronRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => handleDeleteSubscription(sub.id, sub.apiPlan?.api?.name ?? "this API")}
                          disabled={actionLoading === `delete-sub-${sub.id}`}
                          className="p-3 text-xs font-semibold uppercase text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/10 rounded-xl transition-all flex items-center justify-center gap-2"
                          title="Delete subscription"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* API Keys Management */}
                    <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                        <h4 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2 break-words">
                          <Key className="w-5 h-5 flex-shrink-0 text-primary-500" aria-hidden />
                          Access Keys
                        </h4>
                        <Button variant="secondary" size="sm" onClick={() => handleCreateKey(sub.id)} isLoading={actionLoading === `create-${sub.id}`} className="w-full sm:w-auto">
                          Generate New Key
                        </Button>
                      </div>

                      {sub.apiKeys && sub.apiKeys.length > 0 ? (
                        <div className="space-y-4">
                          {sub.apiKeys.map((key) => (
                            <div key={key.id} className="p-4 bg-dark-50 dark:bg-dark-950 rounded-xl border border-dark-200 dark:border-dark-800 flex flex-col sm:flex-row items-center gap-4 group">
                              <div className="flex-1 w-full min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs font-medium text-dark-400 uppercase">Key</span>
                                  <Badge variant="neutral" className="text-xs py-0">{key.id.slice(-6)}</Badge>
                                </div>
                                <div className="flex items-center gap-2 bg-white dark:bg-dark-800 p-2.5 rounded-lg border border-dark-200 dark:border-dark-700">
                                  <code className="flex-1 text-xs font-mono text-primary-600 dark:text-primary-400 truncate">
                                    {key.key}
                                  </code>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(key.key); toast.success("Key copied!"); }}
                                    className="p-1.5 hover:bg-dark-50 dark:hover:bg-dark-900 rounded-lg text-dark-400 hover:text-dark-900 dark:hover:text-dark-200 transition-all flex-shrink-0"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => handleRegenerateKey(sub.id, key.id)} isLoading={actionLoading === `regen-${key.id}`} title="Regenerate Key">
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteKey(sub.id, key.id)} isLoading={actionLoading === `delete-${key.id}`} title="Delete Key" className="text-danger-600">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-10 text-center bg-dark-50 dark:bg-dark-800/50 rounded-xl border border-dashed border-dark-200 dark:border-dark-700">
                          <p className="text-sm text-dark-400">No credentials generated. Click above to get your first key.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent Invoices */}
        <section className="mt-10 sm:mt-12 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3 break-words">
              <FileText className="w-5 h-5 text-primary-500 flex-shrink-0" aria-hidden />
              Recent Invoices
            </h2>
            {recentInvoices.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => router.push("/invoices")} className="w-full sm:w-auto">
                View all invoices
              </Button>
            )}
          </div>
          {recentInvoices.length === 0 ? (
            <Card className="py-8 px-4 text-center border border-dashed border-dark-200 dark:border-dark-800 min-w-0">
              <p className="text-sm text-dark-500 dark:text-dark-400">No invoices yet. They appear when you subscribe to paid plans.</p>
              <Link href="/invoices" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
                Invoices
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-w-0">
              {recentInvoices.map((inv) => (
                <Link key={inv.id} href="/invoices">
                  <Card padding="md" className="border border-dark-200 dark:border-dark-800 hover:border-primary-500/20 transition-all flex flex-row items-center justify-between gap-4 min-w-0 cursor-pointer">
                    <div className="min-w-0">
                      <p className="font-semibold text-dark-900 dark:text-dark-50 truncate">{inv.apiName ?? inv.planName ?? "Subscription"}</p>
                      <p className="text-xs text-dark-500 dark:text-dark-400">
                        {new Date(inv.createdAt).toLocaleDateString()} • {(inv.amount / 100).toFixed(0)} {inv.currency}
                      </p>
                    </div>
                    <Badge variant={invoiceStatusVariant(inv.status)} className="text-xs uppercase flex-shrink-0">
                      {inv.status}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </PageContainer>

      <Footer />

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState(null)}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
        />
      )}
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
      <p className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1">{label}</p>
      <p
        className={cn(
          "text-xs font-bold text-dark-700 dark:text-dark-300 break-all",
          mono &&
            "font-mono text-xs bg-white dark:bg-dark-950 px-1.5 py-0.5 rounded border border-dark-200 dark:border-dark-800"
        )}
      >
        {value || "-"}
      </p>
    </div>
  );
}
