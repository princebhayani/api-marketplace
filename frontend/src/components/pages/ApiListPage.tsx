import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { AuthUser } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  Package, Zap, Shield, Search, ArrowRight, Clock, IndianRupee, UserPlus, Key,
  ChevronLeft, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import { fetchApis, API_PAGE_SIZE, type ApisPagination, type ApiListItem } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface Props {
  user: AuthUser | null;
}

type API = ApiListItem;

export function ApiListPage({ user }: Props) {
  const [apis, setApis] = useState<API[]>([]);
  const [pagination, setPagination] = useState<ApisPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * (pagination?.limit ?? API_PAGE_SIZE) + 1;
  const end = total === 0 ? 0 : Math.min(page * (pagination?.limit ?? API_PAGE_SIZE), total);

  const loadAPIs = useCallback(async (searchTerm: string, pageNum: number) => {
    try {
      setLoading(true);
      const { apis: data, pagination: pag } = await fetchApis({
        search: searchTerm || undefined,
        page: pageNum,
        limit: API_PAGE_SIZE,
      });
      setApis(data);
      setPagination(pag);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load APIs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAPIs(activeSearch, page);
  }, [page, activeSearch, loadAPIs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
      <Header user={user} />

      <PageContainer className="flex-1 py-8 sm:py-10">
        {/* CTA Banner for unauthenticated users */}
        {!user && (
          <div className="mb-8 rounded-xl border border-primary-200 dark:border-primary-800/50 bg-primary-50 dark:bg-primary-950/30 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Key className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span className="text-xs font-medium text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                    Free to browse
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-1">
                  Want to subscribe or create APIs?
                </h2>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  Create a free account to subscribe, manage API keys, and publish your own APIs.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Link href="/register">
                  <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                    Create account
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" size="sm">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 mb-8 min-w-0">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-semibold text-dark-900 dark:text-dark-50 mb-2 tracking-tight">
              API Marketplace
            </h1>
            <p className="text-base text-dark-500 dark:text-dark-400">
              Discover and integrate APIs into your products.
            </p>
          </div>
          <form onSubmit={handleSearchSubmit} className="w-full lg:max-w-sm flex gap-2 min-w-0">
            <Input
              placeholder="Search APIs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="flex-1 min-w-0"
              aria-label="Search APIs"
            />
            <Button type="submit" variant="secondary" size="md" className="flex-shrink-0">
              Search
            </Button>
          </form>
        </div>

        {/* API Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : apis.length === 0 ? (
          <Card className="text-center py-16 border-dashed px-4">
            <Package className="h-12 w-12 mx-auto mb-4 text-dark-300 dark:text-dark-600" aria-hidden />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-1">
              No APIs found
            </h3>
            <p className="text-sm text-dark-500 dark:text-dark-400">
              Try adjusting your search terms.
            </p>
          </Card>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
            {apis.map((api) => (
              <Link key={api.id} href={`/apis/${api.id}`} className="group">
                <Card variant="interactive" padding="none" className="h-full overflow-hidden flex flex-col">
                  {/* Accent bar */}
                  <div className="h-1 bg-gradient-to-r from-primary-500 to-primary-600 opacity-60 group-hover:opacity-100 transition-opacity" />

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                        <Package className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-xs font-medium text-dark-400 dark:text-dark-500">{api.category || "General"}</span>
                    </div>

                    <h3 className="text-base font-semibold text-dark-900 dark:text-dark-50 mb-1.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {api.name}
                    </h3>

                    <p className="text-sm text-dark-500 dark:text-dark-400 mb-4 line-clamp-2 leading-relaxed flex-1">
                      {api.description}
                    </p>

                    <div className="pt-4 border-t border-dark-100 dark:border-dark-800 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <GlanceItem
                          icon={<Shield className="w-3.5 h-3.5" />}
                          label="Auth"
                          value="API Key"
                        />
                        <GlanceItem
                          icon={<Zap className="w-3.5 h-3.5" />}
                          label="Rate limit"
                          value={`${api.publicRateLimitPerMinute || 60}/min`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-dark-400 dark:text-dark-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {new Date(api.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium group-hover:translate-x-0.5 transition-transform">
                          View <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Plans footer */}
                  <div className="px-5 py-3 bg-dark-50/50 dark:bg-dark-800/30 border-t border-dark-100 dark:border-dark-800 flex items-center gap-2">
                    <IndianRupee className="w-3.5 h-3.5 text-success-600" />
                    <span className="text-xs font-medium text-dark-600 dark:text-dark-400">
                      {api.plans?.length || 0} plan{(api.plans?.length || 0) !== 1 ? 's' : ''} available
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && pagination && (
            <nav className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-dark-200 dark:border-dark-800 pt-6" aria-label="API list pagination">
              <p className="text-sm text-dark-500 dark:text-dark-400 order-2 sm:order-1">
                Showing <span className="font-medium">{start}</span>&ndash;<span className="font-medium">{end}</span> of <span className="font-medium">{total}</span>
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  leftIcon={<ChevronLeft className="w-4 h-4" aria-hidden />}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <span className="text-sm text-dark-500 px-2">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!pagination.hasNextPage}
                  rightIcon={<ChevronRight className="w-4 h-4" aria-hidden />}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>
            </nav>
          )}
          </>
        )}
      </PageContainer>

      <Footer />
    </div>
  );
}

function GlanceItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-dark-400 dark:text-dark-500 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-dark-700 dark:text-dark-300 truncate">{value}</span>
    </div>
  );
}
