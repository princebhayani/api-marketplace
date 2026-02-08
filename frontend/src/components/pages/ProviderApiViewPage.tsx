import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkeletonStats, SkeletonCard } from "@/components/ui/Skeleton";
import { fetchProviderApiOverview, submitApiForReview } from "@/services/api";
import {
    CheckCircle, Shield, Terminal, Zap, ExternalLink,
    History, Info, IndianRupee
} from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
    user: AuthUser;
}

export function ProviderApiViewPage({ user }: Props) {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const [api, setApi] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function loadApi() {
            if (!id) return;
            try {
                const data = await fetchProviderApiOverview(id);
                setApi(data);
            } catch (err) {
                toast.error("Failed to load details");
            } finally {
                setLoading(false);
            }
        }
        loadApi();
    }, [id]);

    const handleSubmitForReview = async () => {
        if (!id) return;
        setSubmitting(true);
        try {
            await submitApiForReview(id);
            toast.success("API submitted for review!");
            const data = await fetchProviderApiOverview(id);
            setApi(data);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <SkeletonStats count={3} />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    if (!api) return null;

    return (
        <div className="space-y-8">
            {api.status === "DRAFT" && (
                <Card
                    padding="md"
                    className="border border-amber-200 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-900/20 rounded-xl shadow-sm"
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-200 uppercase tracking-widest mb-1">
                                Review Needed
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-100 font-medium">
                                Your API is currently in draft. Submit it for review so the marketplace team can approve and publish it.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            disabled={submitting}
                            onClick={handleSubmitForReview}
                            className="whitespace-nowrap"
                        >
                            {submitting ? "Submitting..." : "Submit for review"}
                        </Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard label="Total Subs" value={api.stats?.totalSubs?.toLocaleString() || "0"} icon={<Zap className="w-4 h-4 text-primary-500" />} />
            </div>

            <Card padding="md" className="border border-dark-100 dark:border-dark-800 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-6 flex items-center gap-2">
                    <div className="p-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                        <Info className="w-4 h-4 text-primary-500" />
                    </div>
                    Core Specifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-10">
                    <DetailItem label="Endpoint URL" value={api.baseUrl} mono />
                    <DetailItem label="Resource Slug" value={api.slug} mono />
                    <DetailItem label="Category" value={api.category || "General"} />
                    <DetailItem label="Auth Method" value={api.authenticationMethod || "API Key"} />
                    <DetailItem label="Rate Quota" value={`${api.publicRateLimitPerMinute || 60} req/min`} />
                    <DetailItem label="Provider" value={api.providerDisplayName || "Self"} />
                </div>
            </Card>

            <Card padding="md" className="border border-dark-100 dark:border-dark-800 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                        <div className="p-1.5 bg-success-50 dark:bg-success-900/20 rounded-lg">
                            <IndianRupee className="w-4 h-4 text-success-600" />
                        </div>
                        Revenue Streams
                    </h2>
                </div>

                {api.plans?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {api.plans.map((plan: any) => (
                            <div key={plan.id} className="p-6 bg-dark-50/50 dark:bg-dark-800/20 rounded-xl border border-dark-100 dark:border-dark-700 transition-colors hover:bg-white dark:hover:bg-dark-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-bold text-dark-900 dark:text-dark-50">{plan.name}</p>
                                    <Badge variant="neutral" className="text-xs font-semibold uppercase tracking-widest">{plan.billingType}</Badge>
                                </div>
                                <div className="mb-4">
                                    <span className="text-2xl font-semibold text-dark-900 dark:text-dark-50">
                                        {plan.freeTier ? "Free" : `\u20B9${(plan.priceMonthly / 100).toFixed(0)}`}
                                    </span>
                                    {!plan.freeTier && <span className="ml-1 text-xs font-medium text-dark-400">/mo</span>}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-primary-600 dark:text-primary-400">
                                    <Zap className="w-3.5 h-3.5" />
                                    <span>{plan.monthlyQuota?.toLocaleString() || "Unlimited"} requests</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-dark-50/20 dark:bg-dark-800/10 rounded-xl border border-dashed border-dark-200 dark:border-dark-700">
                        <p className="text-xs text-dark-400 font-medium italic">No pricing tiers defined.</p>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {api.codeExamples && (
                    <Card padding="none" className="border border-dark-100 dark:border-dark-800 rounded-xl shadow-sm overflow-hidden flex flex-col bg-dark-950">
                        <div className="px-5 py-4 border-b border-dark-900">
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-dark-400 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-primary-500" />
                                Integration Snippet
                            </h3>
                        </div>
                        <pre className="flex-1 text-xs p-5 text-primary-400 overflow-auto scrollbar-hide font-mono leading-relaxed">
                            <code>{api.codeExamples}</code>
                        </pre>
                    </Card>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <Card padding="md" className="flex items-center gap-4 border border-dark-100 dark:border-dark-800 shadow-sm transition-all hover:scale-[1.01] bg-white dark:bg-dark-900">
            <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800 shadow-inner-soft">
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest">{label}</p>
                <p className="text-xl font-semibold text-dark-900 dark:text-dark-50">{value}</p>
            </div>
        </Card>
    );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-1.5">{label}</p>
            <p className={cn(
                "text-sm font-bold text-dark-800 dark:text-dark-300 break-all",
                mono && "font-mono bg-dark-50 dark:bg-dark-800 px-2 py-1 rounded text-xs"
            )}>
                {value || "Not set"}
            </p>
        </div>
    );
}

function ExternalLinkItem({ label, url }: { label: string; url?: string }) {
    if (!url) return null;
    return (
        <a href={url} target="_blank" rel="noreferrer"
            className="flex items-center justify-between px-5 py-3 rounded-xl bg-dark-50 dark:bg-dark-800 border border-transparent hover:border-primary-500/20 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:text-primary-600 transition-all text-xs font-semibold uppercase tracking-widest">
            <span>{label}</span>
            <ExternalLink className="w-3.5 h-3.5" />
        </a>
    );
}
