import { billStatus, dueDateLabel } from "@/lib/billing";

export function BillPaymentStatus({ due_date, paid_at }: { due_date: string | null; paid_at: string | null }) {
  const status = billStatus({ due_date, paid_at });
  return <div className="mt-2 space-y-1 text-xs">
    <div className="text-muted-foreground">{due_date ? `Vencimento: ${dueDateLabel(due_date)}` : "Vencimento não informado"}</div>
    <span className={status === "paid" ? "inline-flex rounded-md bg-success/15 px-2 py-1 font-medium text-success" : status === "overdue" ? "inline-flex rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive" : "inline-flex rounded-md bg-highlight/15 px-2 py-1 font-medium text-highlight"}>
      {status === "paid" ? `Pago · ${new Date(paid_at ?? "").toLocaleDateString("pt-BR")}` : status === "overdue" ? "Vencida" : "Em aberto"}
    </span>
  </div>;
}