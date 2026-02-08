import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonStats, SkeletonCard } from "@/components/ui/Skeleton";
import { Package, Plus, Terminal, ExternalLink, IndianRupee, TrendingUp } from "lucide-react";
import { getMyApis, getProviderRevenue } from "@/services/api";
import { cn } from "@/utils/cn";

interface Props {
  user: AuthUser;
}

interface RevenueByApi {
  apiId: string;
  apiName: string;
  revenue: number;
  subscriptionRevenue: number;
}

interface ProviderRevenueSummary {
  totalRevenue: number;
  netRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  timeSeries?: { date: string; revenue: number; netRevenue: number }[];
  byApi?: RevenueByApi[];
}

export function ProviderDashboardPage({ user }: Props) {
  const [apis, setApis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<ProviderRevenueSummary | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadApis();
  }, []);

  async function loadApis() {
    try {
      const [apisData, revenueData] = await Promise.all([
        getMyApis(),
        getProviderRevenue().catch((error) => {
          console.error("Failed to load provider revenue", error);
          return null;
        }),
      ]);

      setApis(apisData);

      if (revenueData) {
        setRevenue({
          totalRevenue: revenueData.totalRevenue,
          netRevenue: revenueData.netRevenue,
          commissionRate: revenueData.commissionRate,
          commissionAmount: revenueData.commissionAmount ?? Math.round(revenueData.totalRevenue * (revenueData.commissionRate || 0)),
          currency: revenueData.currency || "INR",
          timeSeries: revenueData.timeSeries,
          byApi: revenueData.byApi,
        });
      }
    } catch (err) {
      toast.error("Failed to load APIs");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
        <Header user={user} />
        <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
          <div className="mb-6 sm:mb-10">
            <div className="h-8 w-72 bg-dark-100 dark:bg-dark-800 rounded animate-pulse mb-2" />
            <div className="h-5 w-56 bg-dark-100 dark:bg-dark-800 rounded animate-pulse" />
          </div>
          <SkeletonStats count={3} />
          <div className="mt-8 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950 min-w-0">
      <Header user={user} />

      <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
        <div className="page-header mb-6 sm:mb-10 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-dark-900 dark:text-dark-50 mb-2 break-words">Provider Command Center</h1>
              <p className="text-base sm:text-lg text-dark-600 dark:text-dark-400 break-words">Manage and monetize your technical assets.</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/provider/apis/create")}
              leftIcon={<Plus className="h-5 w-5 flex-shrink-0" aria-hidden />}
              className="w-full sm:w-auto min-w-0"
            >
              Create API
            </Button>
          </div>
        </div>

        {revenue && (
          <section className="mb-8 sm:mb-10 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-2 mb-4 sm:mb-6 break-words">
              <IndianRupee className="h-5 w-5 flex-shrink-0 text-primary-500" aria-hidden />
              Full earnings (last 30 days)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 min-w-0">
              <Card padding="lg" className="flex items-center gap-6">
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800">
                  <TrendingUp className="h-6 w-6 text-primary-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-1">
                    Gross revenue (total)
                  </p>
                  <p className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
                    {revenue.currency} {(revenue.totalRevenue / 100).toFixed(2)}
                  </p>
                </div>
              </Card>
              <Card padding="lg" className="flex items-center gap-6">
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800">
                  <Terminal className="h-6 w-6 text-accent-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-1">
                    Platform commission ({(revenue.commissionRate * 100).toFixed(0)}%)
                  </p>
                  <p className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
                    {revenue.currency} {(revenue.commissionAmount / 100).toFixed(2)}
                  </p>
                </div>
              </Card>
              <Card padding="lg" className="flex items-center gap-6">
                <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800">
                  <IndianRupee className="h-6 w-6 text-success-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-1">
                    Net earnings (your take-home)
                  </p>
                  <p className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
                    {revenue.currency} {(revenue.netRevenue / 100).toFixed(2)}
                  </p>
                </div>
              </Card>
            </div>
            {revenue.byApi && revenue.byApi.length > 0 && (
              <Card padding="lg" className="border-dark-100 dark:border-dark-800 min-w-0 overflow-hidden">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-4">Revenue by API</p>
                <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin" role="region" aria-label="Revenue by API table">
                  <table className="w-full text-sm min-w-[20rem]">
                    <thead>
                      <tr className="border-b border-dark-100 dark:border-dark-800">
                        <th className="text-left py-3 px-2 font-bold text-dark-600 dark:text-dark-400">API</th>
                        <th className="text-right py-3 px-2 font-bold text-dark-600 dark:text-dark-400">Revenue ({revenue.currency})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.byApi.map((row) => (
                        <tr key={row.apiId} className="border-b border-dark-50 dark:border-dark-800/50">
                          <td className="py-3 px-2 font-medium text-dark-900 dark:text-dark-50">{row.apiName}</td>
                          <td className="py-3 px-2 text-right font-bold text-dark-900 dark:text-dark-50">{(row.revenue / 100).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        )}

        {/* APIs List */}
        <section className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-3 break-words">
              <Terminal className="text-primary-500 flex-shrink-0" aria-hidden />
              Your API Portfolio
            </h2>
            <p className="text-sm font-bold text-dark-400 uppercase tracking-widest">{apis.length} APIs Managed</p>
          </div>

          {apis.length === 0 ? (
            <Card className="text-center py-12 sm:py-24 border border-dashed px-4">
              <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 text-dark-200 dark:text-dark-700 flex-shrink-0" aria-hidden />
              <h3 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-dark-50 mb-2 break-words">
                No APIs Published
              </h3>
              <p className="text-sm sm:text-base text-dark-500 mb-6 sm:mb-8 max-w-md mx-auto break-words">
                Start monetizing your code by publishing your first API to the marketplace today.
              </p>
              <Button size="lg" onClick={() => router.push("/provider/apis/create")} className="w-full sm:w-auto">
                Get Started
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 min-w-0">
              {apis.map((api) => (
                <Card key={api.id} padding="none" className="overflow-hidden border hover:border-primary-500/30 transition-all group min-w-0">
                  <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-dark-100 dark:divide-dark-800 min-w-0">
                    {/* Left: General Info */}
                    <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                            <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-dark-900 dark:text-dark-50 group-hover:text-primary-600 transition-colors">
                              {api.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={api.status === 'PUBLISHED' ? 'success' : 'warning'} className="text-xs font-semibold tracking-widest">
                                {api.status}
                              </Badge>
                              <span className="text-xs font-bold text-dark-400 uppercase tracking-wider">{api.category || "General"}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/provider/apis/${api.id}/overview`)} title="API Overview">
                          <ExternalLink className="w-4 h-4 text-dark-400" />
                        </Button>
                      </div>

                      <p className="text-sm text-dark-600 dark:text-dark-400 mb-6 line-clamp-2 leading-relaxed">
                        {api.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-dark-50 dark:border-dark-800">
                        <GlanceInfo label="Base URL" value={api.baseUrl} mono />
                        <GlanceInfo label="Auth" value={api.authenticationMethod || "API Key"} />
                        <GlanceInfo label="Rate Limit" value={`${api.publicRateLimitPerMinute || 60}/m`} />
                        <GlanceInfo label="Updated" value={new Date(api.updatedAt).toLocaleDateString()} />
                      </div>
                    </div>

                    {/* Right: Actions & Performance */}
                    <div className="lg:w-80 flex-shrink-0 bg-dark-50/50 dark:bg-dark-950/50 p-4 sm:p-6 lg:p-8 flex flex-col justify-between gap-6 sm:gap-8 min-w-0">
                      <div>
                        <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-4">Quick Insights</p>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-dark-500">Active Subs</span>
                            <span className="text-sm font-bold text-dark-900 dark:text-dark-50">{api.activeSubscriptionsCount ?? 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-dark-500">Current Uptime</span>
                            <span className="text-sm font-bold text-success-600">100%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-dark-500">Total Plans</span>
                            <span className="text-sm font-bold text-dark-900 dark:text-dark-50">{api.plans?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <Button variant="secondary" className="w-full" onClick={() => router.push(`/provider/apis/edit/${api.id}`)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </PageContainer>
      <Footer />
    </div>
  );
}

function GlanceInfo({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={cn(
        "text-xs font-bold text-dark-700 dark:text-dark-300 truncate",
        mono && "font-mono bg-dark-100 dark:bg-dark-800/80 px-1.5 py-0.5 rounded text-xs"
      )}>
        {value || "-"}
      </p>
    </div>
  );
}
