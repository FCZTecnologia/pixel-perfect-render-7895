import { cn } from "@/lib/utils";
import { priorityClass, priorityLabel, statusClass, statusLabel, type OsPriority, type OsStatus } from "@/lib/condo";

export function StatusBadge({ status }: { status: OsStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium", statusClass[status])}>
      {statusLabel[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: OsPriority }) {
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", priorityClass[priority])}>
      {priorityLabel[priority]}
    </span>
  );
}

export function Panel({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-2xl p-5 lg:p-6", className)} {...p} />;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-semibold lg:text-3xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}
