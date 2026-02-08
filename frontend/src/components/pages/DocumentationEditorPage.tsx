import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { fetchProviderApiDocs, updateApi } from "@/services/api";
import { FileText, Save, Eye, Code, Info } from "lucide-react";

interface Props {
    user: AuthUser;
}

export function DocumentationEditorPage({ user }: Props) {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const [api, setApi] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [markdown, setMarkdown] = useState("");

    useEffect(() => {
        async function loadApi() {
            if (!id) return;
            try {
                const data = await fetchProviderApiDocs(id);
                setApi(data);
                setMarkdown(data.documentation || "");
            } catch (err) {
                toast.error("Failed to load documentation");
            } finally {
                setLoading(false);
            }
        }
        loadApi();
    }, [id]);

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            await updateApi(id, { documentation: markdown });
            toast.success("Documentation saved successfully!");
            const data = await fetchProviderApiDocs(id);
            setApi(data);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-10">
                <div className="flex items-center justify-between px-1">
                    <Skeleton height="2rem" width="14rem" />
                    <Skeleton height="2.5rem" width="10rem" />
                </div>
                <Skeleton variant="rectangular" height="700px" width="100%" className="rounded-xl" />
            </div>
        );
    }

    if (!api) return null;

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-4">
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                        <FileText className="w-5 h-5 text-primary-500" />
                    </div>
                    Developer Guide
                </h2>
                <div className="flex gap-4 items-center">
                    <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-dark-50 dark:bg-dark-900 rounded-xl border border-dark-100 dark:border-dark-800 text-xs font-semibold text-dark-400 uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-success-500" />
                        Live Preview
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        className="px-8 rounded-xl"
                        onClick={handleSave}
                        isLoading={saving}
                        leftIcon={<Save className="w-4 h-4" />}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>

            <Card padding="none" className="overflow-hidden border border-dark-100 dark:border-dark-800 rounded-xl bg-white dark:bg-dark-950">
                <div className="px-6 py-4 bg-dark-50/50 dark:bg-dark-900/50 border-b border-dark-100 dark:border-dark-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-dark-100 dark:bg-dark-800 rounded-lg">
                            <Code className="w-4 h-4 text-dark-500" />
                        </div>
                        <span className="text-xs font-semibold text-dark-900 dark:text-dark-100 uppercase tracking-widest">
                            Markdown Workspace
                        </span>
                    </div>
                    <span className="text-xs font-bold text-dark-400 italic font-mono uppercase">autosave: off</span>
                </div>
                <div className="min-h-[700px]">
                    <MarkdownEditor
                        value={markdown}
                        onChange={setMarkdown}
                    />
                </div>
            </Card>

            <div className="p-8 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-primary-900/5 dark:to-indigo-900/5 rounded-xl border border-primary-100 dark:border-primary-900/20 shadow-sm">
                <div className="flex items-start gap-6">
                    <div className="p-3 bg-primary-500 rounded-xl text-white shadow-sm">
                        <Info className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-2">Optimization Insights</h4>
                        <p className="text-sm text-primary-700 dark:text-primary-300 font-bold leading-relaxed max-w-3xl">
                            Clear technical communication reduces support volume. Focus on detailed endpoint definitions,
                            authentication prerequisites, and annotated JSON response schemas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
