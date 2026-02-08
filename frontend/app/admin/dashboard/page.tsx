"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonStats, SkeletonCard } from "@/components/ui/Skeleton";
import {
  getAdminOverview,
  getAdminFinance,
  getAdminApis,
} from "@/services/api";
import {
  Activity,
  BarChart3,
  FileText,
  IndianRupee,
  Globe,
  Package,
  TrendingUp,
  Users,
  ArrowRight,
} from "lucide-react";

interface AdminOverviewData {
  apiCount: number;
  userCount: number;
  invoiceStats: any[];
  dailyUsage: any[];
}

export default function AdminDashboardRoute() {
  const { user } = useAuth();

  return (
    <RequireRole roles={["SuperAdmin"]}>
      <AdminDashboardPage />
    </RequireRole>
  );
}

function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [finance, setFinance] = useState<any | null>(null);
  const [apisSummary, setApisSummary] = useState<{
    total: number;
    review: number;
    live: number;
    suspended: number;
  }>({ total: 0, review: 0, live: 0, suspended: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [overviewData, financeData, apis] = await Promise.all([
          getAdminOverview().catch(() => null),
          getAdminFinance().catch(() => null),
          getAdminApis().catch(() => []),
        ]);

        if (overviewData) {
          setOverview(overviewData);
        }
        if (financeData) {
          setFinance(financeData);
        }
        if (Array.isArray(apis)) {
          setApisSummary({
            total: apis.length,
            review: apis.filter((a: any) => a.status === "REVIEW").length,
            live: apis.filter((a: any) => a.status === "LIVE").length,
            suspended: apis.filter((a: any) => a.status === "SUSPENDED").length,
          });
        }
      } catch {
        toast.error("Failed to load admin overview");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <Shell>
        <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
          <SkeletonStats count={4} />
          <div className="mt-6">
            <SkeletonCard />
          </div>
        </PageContainer>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
        <div className="mb-6 sm:mb-10 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-500 mb-1">
            Admin workspace
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-dark-900 dark:text-dark-50 mb-2 flex flex-wrap items-center gap-2 sm:gap-3 break-words">
            Platform overview
            <Badge variant="neutral" className="text-xs uppercase flex-shrink-0">
              Super admin
            </Badge>
          </h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 max-w-2xl break-words">
            Monitor marketplace health, finances, and API lifecycle from a single control
            center.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-10 min-w-0">
          <StatCard
            label="Total APIs"
            value={overview?.apiCount ?? apisSummary.total}
            icon={<Package className="w-5 h-5 text-primary-500" />}
          />
          <StatCard
            label="Total users"
            value={overview?.userCount ?? 0}
            icon={<Users className="w-5 h-5 text-accent-500" />}
          />
          <StatCard
            label="Live APIs"
            value={apisSummary.live}
            icon={<Globe className="w-5 h-5 text-success-500" />}
          />
          <StatCard
            label="Suspended"
            value={apisSummary.suspended}
            icon={<Activity className="w-5 h-5 text-danger-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10 min-w-0">
          <Card padding="lg" className="lg:col-span-2 border border-dark-100 dark:border-dark-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                Usage & activity
              </h2>
              <Badge variant="neutral" className="text-xs uppercase">
                Last {overview?.dailyUsage?.length ?? 0} days
              </Badge>
            </div>
            {overview?.dailyUsage && overview.dailyUsage.length > 0 ? (
              <p className="text-sm text-dark-500 dark:text-dark-400">
                Usage analytics available via backend; plug in a chart library here if needed.
              </p>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400 italic">
                No usage data yet. Traffic will appear here as consumers start calling APIs.
              </p>
            )}
          </Card>

          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-success-500" />
              Revenue snapshot
            </h2>
            {finance ? (
              <div className="space-y-3 text-sm text-dark-600 dark:text-dark-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Total revenue</span>
                  <span className="font-mono">
                    {typeof finance.totalRevenue === "number"
                      ? `₹${(finance.totalRevenue / 100).toFixed(0)}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">This month</span>
                  <span className="font-mono">
                    {typeof finance.monthRevenue === "number"
                      ? `₹${(finance.monthRevenue / 100).toFixed(0)}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-success-600 dark:text-success-400">
                  <span className="flex items-center gap-1 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Trend
                  </span>
                  <span>{finance.trendLabel ?? "Stable"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400 italic">
                Finance analytics aren&apos;t available yet.
              </p>
            )}
          </Card>
        </div>

        {/* Invoice stats and recent invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10 min-w-0">
          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Invoice stats
            </h2>
            {finance?.invoiceStatuses && finance.invoiceStatuses.length > 0 ? (
              <div className="space-y-3 text-sm">
                {finance.invoiceStatuses.map((s: { status: string; count: number; total: number }) => (
                  <div key={s.status} className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-800 last:border-0">
                    <span className="font-bold capitalize text-dark-700 dark:text-dark-300">{s.status.toLowerCase()}</span>
                    <span className="font-mono text-dark-600 dark:text-dark-400">
                      {s.count} invoice{s.count !== 1 ? "s" : ""} · ₹{((s.total || 0) / 100).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400 italic">No invoice data yet.</p>
            )}
          </Card>
          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-success-500" />
              Recent invoices
            </h2>
            {finance?.recentInvoices && finance.recentInvoices.length > 0 ? (
              <div className="space-y-2 text-sm max-h-[240px] overflow-y-auto">
                {finance.recentInvoices.map((inv: { id: string; amount: number; status: string; createdAt: string; userName?: string; apiName?: string }) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-800 last:border-0">
                    <div className="min-w-0">
                      <p className="font-bold text-dark-900 dark:text-dark-50 truncate">{inv.apiName ?? "N/A"}</p>
                      <p className="text-xs text-dark-500 dark:text-dark-400 truncate">{inv.userName ?? inv.id.slice(0, 8)} · {new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono font-bold">₹{(inv.amount / 100).toFixed(0)}</span>
                      <Badge variant={inv.status === "PAID" ? "success" : inv.status === "PENDING" ? "warning" : "danger"} className="text-xs uppercase">
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400 italic">No recent invoices.</p>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-500" />
                APIs requiring review
              </h2>
              <Badge variant="warning" className="text-xs uppercase">
                {apisSummary.review} pending
              </Badge>
            </div>
            {apisSummary.review > 0 ? (
              <p className="text-sm text-dark-600 dark:text-dark-300 mb-4">
                There are APIs awaiting your decision. Review them to keep the marketplace
                fresh and safe.
              </p>
            ) : (
              <p className="text-sm text-dark-500 dark:text-dark-400 italic mb-4">
                Nothing in the review queue. Great job keeping up!
              </p>
            )}
            <Button
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => router.push("/admin/apis")}
            >
              Go to APIs moderation
            </Button>
          </Card>

          <Card padding="lg" className="border border-dark-100 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent-500" />
              Operational notes
            </h2>
            <ul className="space-y-3 text-sm text-dark-600 dark:text-dark-300">
              <li>
                Use the <span className="font-bold">APIs moderation</span> view to change
                lifecycle states and inspect providers.
              </li>
              <li>
                Status changes are reflected to providers in their{" "}
                <span className="font-bold">dashboard views</span> according to their new state.
              </li>
              <li>
                Keep an eye on <span className="font-bold">LIVE</span> vs{" "}
                <span className="font-bold">SUSPENDED</span> ratios to maintain marketplace
                quality.
              </li>
            </ul>
          </Card>
        </div>
      </PageContainer>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950 min-w-0">
      <Header user={user!} />
      {children}
      <Footer />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card padding="lg" className="flex items-center gap-4">
      <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
          {Number.isFinite(value) ? value.toString() : "—"}
        </p>
      </div>
    </Card>
  );
}
