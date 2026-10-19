export function billStatus(bill: { paid_at: string | null; due_date: string | null }, today = new Date().toLocaleDateString("en-CA")) {
  if (bill.paid_at) return "paid";
  return bill.due_date && bill.due_date < today ? "overdue" : "pending";
}

export function dueDateLabel(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}