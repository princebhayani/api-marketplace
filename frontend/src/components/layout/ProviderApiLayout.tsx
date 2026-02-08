import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { LayoutDashboard, Package } from "lucide-react";
import { PageContainer } from "./PageContainer";
import { Badge } from "../ui/Badge";
import { cn } from "../../utils/cn";

export interface ProviderApiLayoutApi {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
}

export interface ProviderApiLayoutProps {
  api: ProviderApiLayoutApi;
  children?: ReactNode;
}

interface ProviderApiTab {
  id: string;
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
}

function getStatusBadgeVariant(status: string | null | undefined): "success" | "warning" {
  if (status === "PUBLISHED" || status === "LIVE") {
    return "success";
  }
  return "warning";
}

export function ProviderApiLayout({ api, children }: ProviderApiLayoutProps) {
  const pathname = usePathname() ?? "";

  const tabs: ReadonlyArray<ProviderApiTab> = [
    {
      id: "overview",
      label: "Overview",
      href: `/provider/apis/${api.id}/overview`,
      Icon: LayoutDashboard,
    },
  ];

  return (
    <PageContainer className="flex-1 py-6 sm:py-10 min-w-0">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-8 sm:mb-12 items-center sm:items-start text-center sm:text-left min-w-0">
        <div className="flex-shrink-0 p-3 sm:p-4 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-100 dark:border-dark-700 h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center shadow-sm text-primary-600 dark:text-primary-400">
          <Package className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" aria-hidden />
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-dark-900 dark:text-dark-50 tracking-tight truncate leading-tight break-words">
              {api.name}
            </h1>
            <Badge
              variant={getStatusBadgeVariant(api.status)}
              className="font-medium text-xs uppercase px-2 py-0.5 rounded-lg flex-shrink-0"
            >
              {api.status}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 max-w-3xl leading-relaxed line-clamp-2 break-words mx-auto sm:mx-0">
            {api.description}
          </p>
        </div>

        <div
          id="layout-header-actions"
          className="flex flex-wrap gap-2 sm:gap-3 min-h-[2.5rem] items-center justify-center sm:justify-end w-full sm:w-auto min-w-0"
        />
      </div>

      <div className="space-y-6 sm:space-y-10 min-h-[50vh] sm:min-h-[65vh] min-w-0">
        <main>
          <div key={pathname} className="animate-slide-up transform-gpu">
            {children}
          </div>
        </main>
      </div>
    </PageContainer>
  );
}
