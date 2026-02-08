"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { AuthUser } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonList } from "@/components/ui/Skeleton";
import { getAuditLogs, type AuditLogEntry } from "@/services/api";
import {
  Activity,
  ChevronLeft,
  ChevronDown,
  LogIn,
  LogOut,
  UserPlus,
  Key,
  CreditCard,
  Package,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  user: AuthUser;
}

const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: "Account created",
  LOGIN_SUCCESS: "Logged in",
  LOGIN_FAILED: "Login failed",
  LOGOUT: "Logged out",
  API_KEY_CREATED: "API key created",
  API_KEY_REVOKED: "API key revoked",
  API_KEY_DELETED: "API key deleted",
  API_KEY_REGENERATED: "API key regenerated",
  SUBSCRIPTION_CREATED: "Subscription started",
  SUBSCRIPTION_CANCELLED: "Subscription cancelled",
  PAYMENT_SUCCEEDED: "Payment succeeded",
  PASSWORD_CHANGED: "Password changed",
  PROFILE_UPDATED: "Profile updated",
};

function actionIcon(action: string) {
  const iconClass = "w-4 h-4 flex-shrink-0";
  if (action.includes("LOGIN_SUCCESS") || action.includes("USER_REGISTERED")) return <LogIn className={iconClass} />;
  if (action === "LOGOUT") return <LogOut className={iconClass} />;
  if (action === "USER_REGISTERED") return <UserPlus className={iconClass} />;
  if (action.includes("API_KEY")) return <Key className={iconClass} />;
  if (action.includes("PAYMENT")) return <CreditCard className={iconClass} />;
  if (action.includes("SUBSCRIPTION")) return <Package className={iconClass} />;
  if (action === "PASSWORD_CHANGED") return <Shield className={iconClass} />;
  if (action === "PROFILE_UPDATED") return <User className={iconClass} />;
  return <Activity className={iconClass} />;
}

function actionColor(action: string): string {
  if (action.includes("SUCCESS") || action === "USER_REGISTERED" || action === "PAYMENT_SUCCEEDED") return "text-success-600 dark:text-success-400";
  if (action === "LOGOUT" || action.includes("REVOKED") || action.includes("CANCELLED") || action.includes("DELETED")) return "text-dark-500 dark:text-dark-400";
  if (action === "LOGIN_FAILED") return "text-danger-600 dark:text-danger-400";
  return "text-primary-600 dark:text-primary-400";
}

function formatDate(d: string) {
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const parts: string[] = [];
  if (metadata.apiName && typeof metadata.apiName === "string") parts.push(metadata.apiName);
  if (metadata.amount != null) parts.push(`${metadata.currency ?? "INR"} ${metadata.amount}`);
  if (metadata.method && typeof metadata.method === "string") parts.push(metadata.method === "oauth" ? "OAuth" : "Password");
  return parts.length ? parts.join(" · ") : null;
}

export function ActivityPage({ user }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      const { logs: data, nextCursor: cursor, hasMore: more } = await getAuditLogs({ limit: 30 });
      setLogs(data || []);
      setNextCursor(cursor);
      setHasMore(more ?? false);
    } catch {
      toast.error("Failed to load activity");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const { logs: moreLogs, nextCursor: cursor, hasMore: more } = await getAuditLogs({ limit: 30, cursor: nextCursor });
      setLogs((prev) => [...prev, ...(moreLogs || [])]);
      setNextCursor(cursor);
      setHasMore(more ?? false);
    } catch {
      toast.error("Failed to load more");
    } finally {
      setLoadingMore(false);
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
            <Activity className="w-7 h-7 text-primary-500 flex-shrink-0" aria-hidden />
            Activity Log
          </h1>
          <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400 mt-1 break-words">
            View your account activity and security events.
          </p>
        </div>

        {loading ? (
          <SkeletonList count={6} />
        ) : (
          <Card className="overflow-hidden">
            {logs.length === 0 ? (
              <div className="py-16 text-center text-dark-500 dark:text-dark-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No activity yet</p>
                <p className="text-sm mt-1">Your login, subscription, and payment events will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-dark-100 dark:divide-dark-800">
                {logs.map((entry) => (
                  <li key={entry.id} className="px-5 py-4 sm:py-3">
                    <div className="flex gap-3 sm:gap-4">
                      <div
                        className={cn(
                          "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                          "bg-dark-100 dark:bg-dark-800",
                          actionColor(entry.action)
                        )}
                      >
                        {actionIcon(entry.action)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-semibold text-sm text-dark-900 dark:text-dark-50", actionColor(entry.action))}>
                          {ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                        {entry.entity && (
                          <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                            {entry.entity}
                            {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}…` : ""}
                          </p>
                        )}
                        {formatMetadata(entry.metadata) && (
                          <p className="text-sm text-dark-600 dark:text-dark-300 mt-1">{formatMetadata(entry.metadata)}</p>
                        )}
                        <p className="text-xs text-dark-400 dark:text-dark-500 mt-1">{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!loading && hasMore && nextCursor && (
              <div className="border-t border-dark-100 dark:border-dark-800 py-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <>
                      Load more
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
}
