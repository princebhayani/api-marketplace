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
import { SkeletonCard, SkeletonStats } from "@/components/ui/Skeleton";
import {
  Package, IndianRupee, Zap, Check, Shield, BookOpen,
  Info, AlertTriangle, History
} from "lucide-react";
import { fetchApiById, subscribeToPlan, createSubscriptionOrder, getPaymentStatus, verifyRazorpayCheckoutPayment, deleteSubscription } from "@/services/api";
import { cn } from "@/utils/cn";
import { buildGatewayUrl } from "@/utils/gatewayUrl";
import { renderMarkdown } from "@/utils/markdown";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Props {
  user: AuthUser | null;
}

type Tab = "overview" | "docs" | "pricing";

export function ApiDetailPage({ user }: Props) {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [api, setApi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    loadApi(id);
  }, [id]);

  async function loadApi(apiId: string) {
    try {
      const data = await fetchApiById(apiId);
      setApi(data);
    } catch (err) {
      toast.error("Failed to load API details");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function loadRazorpayScript() {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleSubscribe(planId: string) {
    if (!user) {
      const redirect = encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : `/apis/${id}`);
      router.push(`/login?redirect=${redirect}`);
      return;
    }
    setSubscribing(planId);
    try {
      const subscription = await subscribeToPlan(planId);

      if (subscription.status === "PENDING") {
        const orderData = await createSubscriptionOrder(subscription.id);
        const scriptLoaded = await loadRazorpayScript();

        if (!scriptLoaded) {
          toast.error("Failed to load payment gateway. Please check your internet connection.");
          return;
        }

        const subscriptionIdToAbandon = subscription.id;
        const options = {
          key: orderData.razorpayKeyId,
          amount: orderData.razorpayOrder.amount,
          currency: orderData.razorpayOrder.currency,
          name: "API Marketplace",
          description: `Subscription for ${api.name}`,
          order_id: orderData.razorpayOrder.id,
          handler: async function (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
            toast.loading("Verifying payment...", { id: "payment-verify" });
            try {
              await verifyRazorpayCheckoutPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              await getPaymentStatus(orderData.razorpayOrder.id);
              toast.success("Payment successful! Access granted.", { id: "payment-verify" });
              router.push("/dashboard");
            } catch (err) {
              toast.error("Payment verification pending. It will be updated soon.", { id: "payment-verify" });
              router.push("/dashboard");
            }
          },
          modal: {
            ondismiss: async function () {
              try {
                await deleteSubscription(subscriptionIdToAbandon);
                toast.success("Payment cancelled. Subscription removed.");
              } catch {
                toast.error("Could not remove subscription. You can delete it from the dashboard.");
              }
            },
          },
          prefill: user ? { email: user.email } : undefined,
          theme: {
            color: "#4f46e5",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.success("Successfully subscribed!");
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
        <Header user={user} />
        <PageContainer className="flex-1 py-6 sm:py-8 min-w-0">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 rounded-xl bg-dark-100 dark:bg-dark-800 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-64 bg-dark-100 dark:bg-dark-800 rounded animate-pulse" />
              <div className="h-5 w-96 bg-dark-100 dark:bg-dark-800 rounded animate-pulse" />
            </div>
          </div>
          <SkeletonStats count={2} />
          <div className="mt-8">
            <SkeletonCard />
          </div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  if (!api) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950 min-w-0">
      <Header user={user} />

      <PageContainer className="flex-1 py-6 sm:py-8 min-w-0">
        {/* API Hero Section */}
        <div className="mb-8 sm:mb-12 min-w-0">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-4 sm:mb-6 min-w-0">
            <div className="p-4 sm:p-5 rounded-xl bg-primary-600 shadow-sm flex-shrink-0">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-white flex-shrink-0" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <h1 className="text-2xl sm:text-3xl font-semibold text-dark-900 dark:text-dark-50 break-words">
                  {api.name}
                </h1>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary" className="flex-shrink-0">{api.category || "General"}</Badge>
                  {api.isActive && <Badge variant="success" className="flex-shrink-0">Live</Badge>}
                </div>
              </div>
              <p className="text-base sm:text-lg text-dark-600 dark:text-dark-400 max-w-3xl leading-relaxed break-words">
                {api.description}
              </p>
              {api.providerDisplayName && (
                <p className="mt-3 text-sm font-medium text-dark-500 break-words">
                  By <span className="text-primary-600 dark:text-primary-400">{api.providerDisplayName}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:gap-3 w-full sm:w-auto min-w-0">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setActiveTab("pricing")}
                className="w-full sm:min-w-[10rem]"
              >
                View Pricing
              </Button>
            </div>
          </div>
        </div>

        {/* Tabbed Content Navigation */}
        <div className="flex items-center gap-1 border-b border-dark-200 dark:border-dark-800 mb-6 sm:mb-8 overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="API content tabs">
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} label="Overview" icon={<Info className="w-4 h-4 flex-shrink-0" aria-hidden />} />
          <TabButton active={activeTab === "pricing"} onClick={() => setActiveTab("pricing")} label="Pricing" icon={<IndianRupee className="w-4 h-4 flex-shrink-0" aria-hidden />} />
          <TabButton active={activeTab === "docs"} onClick={() => setActiveTab("docs")} label="Documentation" icon={<FileTextIcon className="w-4 h-4 flex-shrink-0" aria-hidden />} />
        </div>

        {/* Tab Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 min-w-0">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 animate-fade-in min-w-0">
            {activeTab === "overview" && (
              <>
                <section className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-3 sm:mb-4 break-words">About this API</h2>
                  <Card padding="lg" className="prose dark:prose-invert max-w-none overflow-hidden min-w-0">
                    <p>{api.description}</p>
                    {api.useCases && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Check className="w-5 h-5 text-success-500" />
                          Common Use Cases
                        </h3>
                        <p className="text-dark-600 dark:text-dark-400 mt-2">{api.useCases}</p>
                      </div>
                    )}
                  </Card>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailCard
                    title="Authentication"
                    icon={<Shield className="w-5 h-5 text-primary-500" />}
                    content={api.authenticationMethod || "API Key Required"}
                  />
                  <DetailCard
                    title="Rate Limits"
                    icon={<Zap className="w-5 h-5 text-warning-500" />}
                    content={api.rateLimits || `${api.publicRateLimitPerMinute || 60} requests per minute`}
                  />
                </section>

                {api.codeExamples && (
                  <section>
                    <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 mb-4">Code Examples</h2>
                    <Card padding="none" className="overflow-hidden">
                      <div className="bg-dark-900 px-4 py-2 border-b border-dark-800 flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500/20" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                          <div className="w-3 h-3 rounded-full bg-green-500/20" />
                        </div>
                        <span className="text-xs font-mono text-dark-500">example.js</span>
                      </div>
                      <pre className="p-6 bg-dark-950 text-primary-400 font-mono text-sm overflow-x-auto">
                        <code>{api.codeExamples}</code>
                      </pre>
                    </Card>
                  </section>
                )}
              </>
            )}

            {activeTab === "pricing" && (
              <section className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4 sm:mb-6 break-words">Choose your plan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
                  {api.plans?.map((plan: any) => (
                    <Card key={plan.id} variant="hover" className="flex flex-col hover:border-primary-500/30 transition-all">
                      <div className="flex-1 p-6">
                        <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50 mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-dark-600 dark:text-dark-400 text-sm mb-6">
                          {plan.description || "Standard access to all endpoints"}
                        </p>

                        <div className="mb-8">
                          {plan.freeTier ? (
                            <div className="text-3xl font-bold text-success-600">Free</div>
                          ) : plan.priceMonthly ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-bold text-dark-900 dark:text-dark-50">
                                ₹{(plan.priceMonthly / 100).toFixed(2)}
                              </span>
                              <span className="text-dark-500 font-medium">/mo</span>
                            </div>
                          ) : (
                            <span className="text-dark-500 font-medium">Enterprise custom</span>
                          )}
                        </div>

                        <ul className="space-y-3 mb-8">
                          <li className="flex items-center gap-2 text-sm text-dark-700 dark:text-dark-300">
                            <Zap className="h-4 w-4 text-primary-500" />
                            <span>{plan.monthlyQuota?.toLocaleString() || "Unlimited"} requests per month</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-6 pt-0">
                        {user ? (
                          <Button
                            variant={plan.freeTier ? "secondary" : "primary"}
                            className="w-full"
                            size="lg"
                            onClick={() => handleSubscribe(plan.id)}
                            isLoading={subscribing === plan.id}
                          >
                            {plan.freeTier ? "Get Started" : "Subscribe Now"}
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            className="w-full"
                            size="lg"
                            onClick={() => handleSubscribe(plan.id)}
                          >
                            Sign in to subscribe
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "docs" && (
              <section>
                <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 mb-4">API Documentation</h2>
                <div className="flex flex-col bg-white dark:bg-dark-950 border border-dark-200 dark:border-dark-800 rounded-xl overflow-hidden">
                  {api.documentation ? (
                    <div className="flex-1 w-full min-h-[500px] p-6 overflow-y-auto bg-dark-50/50 dark:bg-dark-900/30 scrollbar-thin animate-fade-in prose dark:prose-invert max-w-none w-full break-words markdown-new-styling">
                      {renderMarkdown(api.documentation)}
                    </div>
                  ) : (
                    <div className="flex-1 w-full min-h-[400px] flex items-center justify-center p-6 bg-dark-50/50 dark:bg-dark-900/30">
                      <div className="text-center">
                        <BookOpen className="w-12 h-12 text-dark-200 dark:text-dark-700 mx-auto mb-4" />
                        <p className="text-dark-500">Detailed documentation is currently unavailable.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card padding="lg" className="sticky top-24">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 mb-4">Metadata</h3>
              <div className="space-y-4">
                <MetaItem label="Request URL" value={buildGatewayUrl(api.slug)} isMono />
                <MetaItem label="Category" value={api.category || "General"} />
                <MetaItem label="Last Updated" value={new Date(api.updatedAt).toLocaleDateString()} />
              </div>

              {api.changelog && (
                <div className="mt-8 pt-6 border-t border-dark-100 dark:border-dark-800">
                  <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" />
                    Latest Changes
                  </h4>
                  <p className="text-xs text-dark-600 leading-relaxed font-mono bg-dark-50 dark:bg-dark-800 p-3 rounded-lg">
                    {api.changelog}
                  </p>
                </div>
              )}

              {api.errorCodes && (
                <div className="mt-8 pt-6 border-t border-dark-100 dark:border-dark-800">
                  <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Error Codes
                  </h4>
                  <pre className="text-xs text-dark-600 bg-dark-50 dark:bg-dark-800 p-3 rounded-lg overflow-auto max-h-40">
                    {JSON.stringify(api.errorCodes, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>

      <Footer />
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 text-sm font-semibold transition-all whitespace-nowrap min-h-[var(--touch-target-min)] flex-shrink-0",
        active
          ? "border-primary-500 text-primary-600 bg-primary-500/5"
          : "border-transparent text-dark-500 hover:text-dark-900 dark:hover:text-dark-200"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DetailCard({ title, icon, content }: { title: string; icon: React.ReactNode; content: string }) {
  return (
    <Card padding="md" className="flex items-start gap-4">
      <div className="p-2.5 rounded-xl bg-dark-50 dark:bg-dark-800">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-0.5">{title}</p>
        <p className="text-sm font-medium text-dark-900 dark:text-dark-50">{content}</p>
      </div>
    </Card>
  );
}

function MetaItem({ label, value, isMono }: { label: string; value: string; isMono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-sm font-semibold text-dark-900 dark:text-dark-50 truncate", isMono && "font-mono text-xs")}>
        {value}
      </p>
    </div>
  );
}

function FileTextIcon(props: any) {
  return <BookOpen {...props} />;
}
