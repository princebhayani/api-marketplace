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
import { SkeletonList } from "@/components/ui/Skeleton";
import { FileText, IndianRupee, ChevronLeft } from "lucide-react";
import { listMyInvoices } from "@/services/api";

interface Props {
  user: AuthUser;
}

interface Invoice {
  id: string;
  status: string;
  amount: number;
  currency: string;
  apiName?: string | null;
  planName?: string | null;
  createdAt: string;
  periodStart?: string | null;
  periodEnd?: string | null;
}

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvoicesPage({ user }: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      const data = await listMyInvoices(100);
      setInvoices(data || []);
    } catch {
      toast.error("Failed to load invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
      <Header user={user} />
      <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
        <div className="mb-6 sm:mb-8 min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3 break-words">
            <FileText className="w-7 h-7 text-primary-500 flex-shrink-0" aria-hidden />
            My Invoices
          </h1>
          <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400 mt-1 break-words">
            View your billing history and invoice status.
          </p>
        </div>

        {loading ? (
          <SkeletonList count={4} />
        ) : invoices.length === 0 ? (
          <Card className="text-center py-12 sm:py-16 border-dashed px-4">
            <FileText className="h-12 w-12 text-dark-300 dark:text-dark-600 mx-auto mb-4" aria-hidden />
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-2">No invoices yet</h2>
            <p className="text-sm text-dark-500 dark:text-dark-400 mb-6 max-w-sm mx-auto">
              Invoices appear here when you subscribe to paid API plans. Browse the marketplace to get started.
            </p>
            <Button variant="primary" size="md" onClick={() => router.push("/apis")}>
              Browse APIs
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 min-w-0">
            {invoices.map((inv) => (
              <Card key={inv.id} padding="lg" className="hover:border-primary-500/20 transition-all min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-dark-500 dark:text-dark-400 truncate max-w-[200px]" title={inv.id}>
                        {inv.id.slice(0, 8)}…
                      </span>
                      <Badge variant={statusVariant(inv.status)} className="text-xs uppercase">
                        {inv.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-dark-900 dark:text-dark-50 truncate">
                      {inv.apiName ?? inv.planName ?? "Subscription"}
                    </p>
                    {inv.planName && inv.apiName && (
                      <p className="text-xs text-dark-500 dark:text-dark-400">{inv.planName}</p>
                    )}
                    <p className="text-xs text-dark-400 dark:text-dark-500 mt-1">
                      {formatDate(inv.createdAt)}
                      {inv.periodStart && inv.periodEnd && (
                        <span className="ml-2">
                          • {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-1.5 font-semibold text-dark-900 dark:text-dark-50">
                      <IndianRupee className="w-4 h-4 text-primary-500" aria-hidden />
                      {(inv.amount / 100).toFixed(0)}
                      <span className="text-xs font-normal text-dark-500">{inv.currency}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
}
