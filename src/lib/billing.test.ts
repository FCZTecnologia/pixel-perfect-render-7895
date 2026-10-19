import { expect, test } from "bun:test";
import { billStatus, dueDateLabel } from "./billing";

test("payment confirmation overrides an overdue due date", () => {
  expect(billStatus({ paid_at: "2026-10-19T13:57:00Z", due_date: "2026-10-01" }, "2026-10-19")).toBe("paid");
});
test("unpaid invoices become overdue only after their due date", () => {
  expect(billStatus({ paid_at: null, due_date: "2026-10-19" }, "2026-10-19")).toBe("pending");
  expect(billStatus({ paid_at: null, due_date: "2026-10-18" }, "2026-10-19")).toBe("overdue");
});
test("legacy invoices without due dates stay pending", () => {
  expect(billStatus({ paid_at: null, due_date: null }, "2026-10-19")).toBe("pending");
});
test("due dates keep their calendar day without timezone shifts", () => {
  expect(dueDateLabel("2026-10-19")).toBe("19/10/2026");
});