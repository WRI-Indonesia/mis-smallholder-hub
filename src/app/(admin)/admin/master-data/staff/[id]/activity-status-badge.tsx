import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import type { ActivityStatus } from "@/server/actions/staff-activity";

interface ActivityStatusBadgeProps {
  status: ActivityStatus;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  ActivityStatus,
  { label: string; variant: "secondary" | "outline" | "destructive"; icon: React.ReactNode; className: string }
> = {
  DRAFT: {
    label: "Draft",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
    className: "text-muted-foreground",
  },
  PENDING_APPROVAL: {
    label: "Menunggu Approval",
    variant: "outline",
    icon: <Send className="h-3 w-3" />,
    className: "border-yellow-500 text-yellow-600 dark:text-yellow-400",
  },
  APPROVED: {
    label: "Disetujui",
    variant: "outline",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: "border-green-500 text-green-600 dark:text-green-400",
  },
  REJECTED: {
    label: "Perlu Revisi",
    variant: "outline",
    icon: <XCircle className="h-3 w-3" />,
    className: "border-red-500 text-red-600 dark:text-red-400",
  },
};

export function ActivityStatusBadge({
  status,
  showIcon = true,
}: ActivityStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant={config.variant}
      className={`inline-flex items-center gap-1 ${config.className}`}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

export { STATUS_CONFIG };
