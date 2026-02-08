import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createApi, addApiPlan, updateApi } from "@/services/api";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Globe, Shield, FileText, Code, Link as LinkIcon, Settings, IndianRupee } from "lucide-react";

// Character limits (must match backend validation)
const LIMITS = {
    name: 100,
    slug: 80,
    category: 60,
    providerDisplayName: 80,
    description: 150,
    rateLimits: 150,
    planName: 60,
    planDescription: 150,
} as const;

interface Props {
    user: AuthUser;
}

export function CreateApiPage({ user }: Props) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        baseUrl: "",
        category: "",
        description: "",
        providerDisplayName: "",
        authenticationMethod: "API Key",
        publicRateLimitPerMinute: 60,
        rateLimits: "",
        documentation: "",
    });

    const [planData, setPlanData] = useState({
        name: "",
        description: "",
        billingType: "SUBSCRIPTION" as "SUBSCRIPTION" | "FREE",
        priceMonthly: 0,
        monthlyQuota: 1000,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const maxLen = name in LIMITS ? LIMITS[name as keyof typeof LIMITS] : undefined;
        const trimmed = typeof maxLen === "number" && typeof value === "string" ? value.slice(0, maxLen) : value;
        setFormData(prev => ({ ...prev, [name]: trimmed }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Create the API itself
            const { documentation, ...apiPayload } = formData;
            const api = await createApi(apiPayload);

            // 2. Attach initial documentation (optional)
            if (documentation.trim().length > 0) {
                await updateApi(api.id, { documentation });
            }

            // 3. Attach initial pricing plan (optional)
            if (planData.name.trim().length > 0) {
                const payload = {
                    ...planData,
                    priceMonthly:
                        planData.billingType === "FREE"
                            ? 0
                            : Math.round((Number.isNaN(planData.priceMonthly) ? 0 : planData.priceMonthly) * 100),
                    freeTier: planData.billingType === "FREE",
                };
                await addApiPlan(api.id, payload);
            }

            toast.success("API created successfully!");
            router.push(`/provider/apis/${api.id}/overview`);
        } catch (err) {
            const msg = (err as Error).message;
            toast.error(msg || "Something went wrong. Please check character limits and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-dark-950">
            <Header user={user} />
            <PageContainer className="flex-1">
                <div className="max-w-5xl mx-auto">
                    <div className="page-header mb-10">
                        <h1 className="page-title text-3xl font-bold text-dark-900 dark:text-dark-50">Create New API</h1>
                        <p className="page-description text-dark-600 dark:text-dark-400">Publish your API to the marketplace and start monetizing.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in pb-12">
                        <div className="space-y-10">
                            {/* General Section */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                                        <Globe className="w-5 h-5 text-primary-500" />
                                    </div>
                                    General Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="API Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Weather Data API"
                                        required
                                        maxLength={LIMITS.name}
                                        helperText={`${formData.name.length}/${LIMITS.name}`}
                                        leftIcon={<Globe className="w-4 h-4" />}
                                    />
                                    <Input
                                        label="API Slug (URL ID)"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        placeholder="e.g. weather-data-api"
                                        required
                                        maxLength={LIMITS.slug}
                                        helperText={`${formData.slug.length}/${LIMITS.slug}`}
                                        leftIcon={<LinkIcon className="w-4 h-4" />}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        placeholder="e.g. Weather, Finance, AI"
                                        required
                                        maxLength={LIMITS.category}
                                        helperText={`${formData.category.length}/${LIMITS.category}`}
                                    />
                                    <Input
                                        label="Provider Display Name"
                                        name="providerDisplayName"
                                        value={formData.providerDisplayName}
                                        onChange={handleChange}
                                        placeholder="e.g. Your Company Name"
                                        required
                                        maxLength={LIMITS.providerDisplayName}
                                        helperText={`${formData.providerDisplayName.length}/${LIMITS.providerDisplayName}`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">Description (max {LIMITS.description} characters)</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="input min-h-[120px] resize-none"
                                        placeholder="Provide a detailed description of what your API does..."
                                        required
                                        maxLength={LIMITS.description}
                                    />
                                    <p className="text-sm text-dark-500 dark:text-dark-400">
                                        {formData.description.length}/{LIMITS.description}
                                    </p>
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
                                    <label className="label">Rate Limits Description (max {LIMITS.rateLimits} characters)</label>
                                    <textarea
                                        name="rateLimits"
                                        value={formData.rateLimits}
                                        onChange={handleChange}
                                        className="input min-h-[80px] resize-none"
                                        placeholder="e.g. 10 requests per second for pro users..."
                                        maxLength={LIMITS.rateLimits}
                                    />
                                    <p className="text-sm text-dark-500 dark:text-dark-400">
                                        {formData.rateLimits.length}/{LIMITS.rateLimits}
                                    </p>
                                </div>
                            </div>

                            <hr className="border-dark-100 dark:border-dark-800" />

                            {/* Initial Plan */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3">
                                    <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded-xl">
                                        <IndianRupee className="w-5 h-5 text-success-500" />
                                    </div>
                                    Initial Pricing Plan
                                </h2>
                                <p className="text-sm text-dark-500 dark:text-dark-400">
                                    Configure an optional first plan for this API. You can always add or change plans later from
                                    the Management workspace.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Plan Name"
                                        value={planData.name}
                                        onChange={(e) =>
                                            setPlanData((prev) => ({ ...prev, name: e.target.value.slice(0, LIMITS.planName) }))
                                        }
                                        placeholder="e.g. Starter, Pro"
                                        maxLength={LIMITS.planName}
                                        helperText={`${planData.name.length}/${LIMITS.planName}`}
                                    />
                                    <div className="space-y-1.5">
                                        <label className="label">Billing Type</label>
                                        <select
                                            value={planData.billingType}
                                            onChange={(e) =>
                                                setPlanData((prev) => ({
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
                                {planData.billingType === "SUBSCRIPTION" && (
                                    <Input
                                        label="Monthly Price (&#8377;)"
                                        type="number"
                                        value={planData.priceMonthly}
                                        onChange={(e) =>
                                            setPlanData((prev) => ({
                                                ...prev,
                                                priceMonthly: parseFloat(e.target.value || "0"),
                                            }))
                                        }
                                        placeholder="e.g. 499"
                                    />
                                )}
                                <Input
                                    label="Monthly Request Limit"
                                    type="number"
                                    value={planData.monthlyQuota}
                                    onChange={(e) =>
                                        setPlanData((prev) => ({
                                            ...prev,
                                            monthlyQuota: parseInt(e.target.value || "0", 10),
                                        }))
                                    }
                                    placeholder="e.g. 100000"
                                />
                                <div className="space-y-1.5">
                                    <label className="label">Plan Description (max {LIMITS.planDescription} characters)</label>
                                    <textarea
                                        value={planData.description}
                                        onChange={(e) =>
                                            setPlanData((prev) => ({
                                                ...prev,
                                                description: e.target.value.slice(0, LIMITS.planDescription),
                                            }))
                                        }
                                        className="input min-h-[100px] resize-none"
                                        placeholder="Describe what is included in this plan..."
                                        maxLength={LIMITS.planDescription}
                                    />
                                    <p className="text-sm text-dark-500 dark:text-dark-400">
                                        {planData.description.length}/{LIMITS.planDescription}
                                    </p>
                                </div>
                            </div>

                            <hr className="border-dark-100 dark:border-dark-800" />

                            {/* Documentation */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                                        <Code className="w-5 h-5 text-primary-500" />
                                    </div>
                                    Developer Documentation
                                </h2>
                                <p className="text-sm text-dark-500 dark:text-dark-400">
                                    Provide markdown documentation for this API so consumers can start integrating immediately.
                                    Use the toolbar for bold, italic, code, headings, lists, blockquote, and more. Toggle Preview to see how it will look to users.
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
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="secondary" onClick={() => router.push("/provider/dashboard")}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" isLoading={loading} className="px-8">
                                Create API
                            </Button>
                        </div>
                    </form>
                </div>
            </PageContainer>
            <Footer />
        </div>
    );
}
