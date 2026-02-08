import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { fetchProviderApiById, fetchProviderApiDocs, fetchProviderApiPlans, updateApi, addApiPlan, deleteApiPlan } from "@/services/api";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Globe, Shield, Code, Link as LinkIcon, Settings, Trash2, Plus, IndianRupee } from "lucide-react";

interface Props {
    user: AuthUser;
}

export function EditApiPage({ user }: Props) {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [planSaving, setPlanSaving] = useState(false);
    const [showNewPlanForm, setShowNewPlanForm] = useState(false);
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: "",
        message: "",
        variant: "danger" as const,
        onConfirm: () => {},
    });
    const [newPlan, setNewPlan] = useState({
        name: "",
        description: "",
        billingType: "SUBSCRIPTION" as "SUBSCRIPTION" | "FREE",
        priceMonthly: 0,
        monthlyQuota: 1000,
    });
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        baseUrl: "",
        category: "",
        description: "",
        providerDisplayName: "",
        authenticationMethod: "API Key",
        publicRateLimitPerMinute: 60,
        rateLimits: "",
        documentation: "",
    });

    useEffect(() => {
        async function loadApi() {
            if (!id) return;
            try {
                const [api, docsApi, plansApi] = await Promise.all([
                    fetchProviderApiById(id),
                    fetchProviderApiDocs(id),
                    fetchProviderApiPlans(id),
                ]);

                setFormData({
                    name: api.name || "",
                    baseUrl: api.baseUrl || "",
                    category: api.category || "",
                    description: api.description || "",
                    providerDisplayName: api.provider?.displayName || "",
                    authenticationMethod: "API Key",
                    publicRateLimitPerMinute: api.publicRateLimitPerMinute || 60,
                    rateLimits: api.rateLimits || "",
                    documentation: docsApi.documentation || "",
                });

                setPlans(plansApi.plans || []);
            } catch (err) {
                toast.error("Failed to load API details");
                router.push("/provider/dashboard");
            } finally {
                setLoading(false);
            }
        }
        loadApi();
    }, [id, router]);

    const reloadPlans = async () => {
        if (!id) return;
        try {
            const plansApi = await fetchProviderApiPlans(id);
            setPlans(plansApi.plans || []);
        } catch {
            toast.error("Failed to refresh plans");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setSaving(true);
        try {
            await updateApi(id, formData);
            toast.success("API updated successfully!");
            router.push(`/provider/apis/view/${id}`);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddPlan = async () => {
        if (!id) return;
        setPlanSaving(true);
        try {
            const payload = {
                ...newPlan,
                priceMonthly:
                    newPlan.billingType === "FREE"
                        ? 0
                        : Math.round((Number.isNaN(newPlan.priceMonthly) ? 0 : newPlan.priceMonthly) * 100),
                freeTier: newPlan.billingType === "FREE",
            };
            await addApiPlan(id, payload);
            toast.success("Plan added successfully");
            setNewPlan({
                name: "",
                description: "",
                billingType: "SUBSCRIPTION",
                priceMonthly: 0,
                monthlyQuota: 1000,
            });
            await reloadPlans();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setPlanSaving(false);
        }
    };

    const handleDeletePlan = (planId: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Plan",
            message: "Are you sure you want to delete this plan? This action cannot be undone.",
            variant: "danger",
            onConfirm: async () => {
                setConfirmState((prev) => ({ ...prev, isOpen: false }));
                try {
                    await deleteApiPlan(planId);
                    toast.success("Plan deleted successfully");
                    await reloadPlans();
                } catch (err) {
                    toast.error((err as Error).message);
                }
            },
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
                <Header user={user} />
                <PageContainer className="flex-1">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <div className="h-8 w-48 bg-dark-100 dark:bg-dark-800 rounded animate-pulse mb-2" />
                            <div className="h-5 w-64 bg-dark-100 dark:bg-dark-800 rounded animate-pulse" />
                        </div>
                        <SkeletonCard />
                    </div>
                </PageContainer>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
            <Header user={user} />
            <PageContainer className="flex-1">
                <div className="max-w-3xl mx-auto">
                    <div className="page-header mb-8">
                        <h1 className="page-title text-3xl font-bold text-dark-900 dark:text-dark-50">Edit API</h1>
                        <p className="page-description text-dark-600 dark:text-dark-400">Update your API details and settings.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                        <Card padding="lg" className="space-y-8">
                            {/* General Section */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                                        <Globe className="w-5 h-5 text-primary-500" />
                                    </div>
                                    General Information
                                </h2>
                                <Input
                                    label="API Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Weather Data API"
                                    required
                                    leftIcon={<Globe className="w-4 h-4" />}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        placeholder="e.g. Weather, Finance, AI"
                                        required
                                    />
                                    <Input
                                        label="Provider Display Name"
                                        name="providerDisplayName"
                                        value={formData.providerDisplayName}
                                        onChange={handleChange}
                                        placeholder="e.g. Your Company Name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="input min-h-[120px] resize-none"
                                        placeholder="Provide a detailed description of what your API does..."
                                        required
                                    />
                                </div>
                            </div>

                            <hr className="border-dark-100 dark:border-dark-800" />

                            {/* Technical Section */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3">
                                    <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded-xl">
                                        <Settings className="w-5 h-5 text-success-500" />
                                    </div>
                                    Technical Setup
                                </h2>
                                <Input
                                    label="Base URL"
                                    name="baseUrl"
                                    value={formData.baseUrl}
                                    onChange={handleChange}
                                    placeholder="https://api.yourdomain.com/v1"
                                    required
                                    leftIcon={<LinkIcon className="w-4 h-4" />}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="label">Authentication Method</label>
                                        <select
                                            name="authenticationMethod"
                                            value={formData.authenticationMethod}
                                            onChange={handleChange}
                                            className="input"
                                            disabled
                                        >
                                            <option value="API Key">API Key</option>
                                        </select>
                                    </div>
                                    <Input
                                        label="Public Rate Limit (req/min)"
                                        name="publicRateLimitPerMinute"
                                        type="number"
                                        value={formData.publicRateLimitPerMinute}
                                        onChange={handleChange}
                                        required
                                        leftIcon={<Settings className="w-4 h-4" />}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">Rate Limits Description</label>
                                    <textarea
                                        name="rateLimits"
                                        value={formData.rateLimits}
                                        onChange={handleChange}
                                        className="input min-h-[80px] resize-none"
                                        placeholder="e.g. 10 requests per second for pro users..."
                                    />
                                </div>
                            </div>

                            <hr className="border-dark-100 dark:border-dark-800" />

                            {/* Plans Section (with add/delete) */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3">
                                        <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded-xl">
                                            <Shield className="w-5 h-5 text-success-500" />
                                        </div>
                                        Pricing Plans
                                    </h2>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="rounded-xl px-4"
                                        onClick={() => setShowNewPlanForm((prev) => !prev)}
                                    >
                                        {showNewPlanForm ? "Close" : "New Plan"}
                                    </Button>
                                </div>

                                {showNewPlanForm && (
                                <div className="space-y-4 border border-dark-100 dark:border-dark-800 rounded-xl p-4 bg-dark-50/40 dark:bg-dark-900/40">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Plan Name"
                                            value={newPlan.name}
                                            onChange={(e) => setNewPlan((prev) => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Starter, Pro"
                                            required
                                        />
                                        <div className="space-y-1.5">
                                            <label className="label">Billing Type</label>
                                            <select
                                                value={newPlan.billingType}
                                                onChange={(e) =>
                                                    setNewPlan((prev) => ({
                                                        ...prev,
                                                        billingType: e.target.value as "SUBSCRIPTION" | "FREE",
                                                    }))
                                                }
                                                className="input"
                                            >
                                                <option value="SUBSCRIPTION">Monthly Subscription</option>
                                                <option value="FREE">Free Tier</option>
                                            </select>
                                        </div>
                                    </div>
                                    {newPlan.billingType === "SUBSCRIPTION" && (
                                        <Input
                                            label="Monthly Price (&#8377;)"
                                            type="number"
                                            value={newPlan.priceMonthly}
                                            onChange={(e) =>
                                                setNewPlan((prev) => ({
                                                    ...prev,
                                                    priceMonthly: parseFloat(e.target.value || "0"),
                                                }))
                                            }
                                            placeholder="e.g. 499"
                                            leftIcon={<IndianRupee className="w-4 h-4" />}
                                        />
                                    )}
                                    <Input
                                        label="Monthly Request Limit"
                                        type="number"
                                        value={newPlan.monthlyQuota}
                                        onChange={(e) =>
                                            setNewPlan((prev) => ({
                                                ...prev,
                                                monthlyQuota: parseInt(e.target.value || "0", 10),
                                            }))
                                        }
                                        placeholder="e.g. 100000"
                                    />
                                    <div className="space-y-1.5">
                                        <label className="label">Plan Description</label>
                                        <textarea
                                            value={newPlan.description}
                                            onChange={(e) =>
                                                setNewPlan((prev) => ({ ...prev, description: e.target.value }))
                                            }
                                            className="input min-h-[80px] resize-none"
                                            placeholder="Describe what is included in this plan..."
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="primary"
                                            isLoading={planSaving}
                                            leftIcon={<Plus className="w-4 h-4" />}
                                            onClick={handleAddPlan}
                                        >
                                            Add Plan
                                        </Button>
                                    </div>
                                </div>
                                )}

                                {plans && plans.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {plans.map((plan) => (
                                            <div
                                                key={plan.id}
                                                className="p-5 bg-dark-50/40 dark:bg-dark-900/40 rounded-xl border border-dark-100 dark:border-dark-800"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-bold text-dark-900 dark:text-dark-50">
                                                        {plan.name}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-semibold uppercase tracking-widest text-dark-400">
                                                            {plan.billingType}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            className="text-danger-600 border-danger-200 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                                                            onClick={() => handleDeletePlan(plan.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-dark-600 dark:text-dark-300 mb-3 line-clamp-3">
                                                    {plan.description || "No description provided."}
                                                </p>
                                                <div className="flex items-center justify-between text-xs font-bold text-dark-700 dark:text-dark-200">
                                                    <span>
                                                        {plan.freeTier
                                                            ? "Free"
                                                            : `\u20B9${(plan.priceMonthly / 100).toFixed(0)} / mo`}
                                                    </span>
                                                    <span>
                                                        {plan.monthlyQuota
                                                            ? `${plan.monthlyQuota.toLocaleString()} req/mo`
                                                            : "Unlimited"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-dark-500 dark:text-dark-400 italic">
                                        No pricing plans configured for this API.
                                    </p>
                                )}
                            </div>

                            <hr className="border-dark-100 dark:border-dark-800" />

                            {/* Documentation Section */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                                        <Code className="w-5 h-5 text-primary-500" />
                                    </div>
                                    Developer Documentation
                                </h2>
                                <p className="text-sm text-dark-500 dark:text-dark-400">
                                    Update the markdown documentation that consumers see. Use the toolbar for bold, italic, code, headings, lists, blockquote, and more. Toggle Preview to see how it will look to users.
                                </p>
                                <div className="space-y-1.5">
                                    <label className="label">Documentation (Markdown)</label>
                                    <div className="min-h-[400px] rounded-xl overflow-hidden border border-dark-200 dark:border-dark-800">
                                        <MarkdownEditor
                                            value={formData.documentation}
                                            onChange={(val) => setFormData((prev) => ({ ...prev, documentation: val }))}
                                            placeholder="# Overview\n\nDescribe authentication, key endpoints, and example requests..."
                                        />
                                    </div>
                                </div>
                            </div>

                        </Card>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="secondary" onClick={() => router.push(`/provider/apis/view/${id}`)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" isLoading={saving} className="px-8">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </div>
            </PageContainer>
            <Footer />

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                confirmText="Delete"
            />
        </div>
    );
}
