import type { Bill, ServiceOrder } from "./condo";

export function activeFilterUnits<T extends { active: boolean; terminated_at: string | null }>(units: T[]): T[] {
  return units.filter((unit) => unit.active && !unit.terminated_at);
}

export function terminationPendingItems<B extends Pick<Bill, "paid_at">, O extends Pick<ServiceOrder, "status">>(bills: B[], orders: O[]) {
  return {
    bills: bills.filter((bill) => !bill.paid_at),
    orders: orders.filter((order) => order.status === "pendente" || order.status === "em_andamento"),
  };
}

export function pendingItemsSignature(items: { bills: { id: string }[]; orders: { id: string }[] }) {
  return JSON.stringify(items);
}