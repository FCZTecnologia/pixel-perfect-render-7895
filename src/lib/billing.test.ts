import { test } from "node:test";
import { strict as assert } from "node:assert";
import { billStatus, dueDateLabel } from "./billing";

test("payment confirmation overrides an overdue due date", () => {
  assert.equal(billStatus({ paid_at: "2026-10-19T13:57:00Z", due_date: "2026-10-01" }, "2026-10-19"), "paid");
});
test("unpaid invoices become overdue only after their due date", () => {
  assert.equal(billStatus({ paid_at: null, due_date: "2026-10-19" }, "2026-10-19"), "pending");
  assert.equal(billStatus({ paid_at: null, due_date: "2026-10-18" }, "2026-10-19"), "overdue");
});
test("legacy invoices without due dates stay pending", () => {
  assert.equal(billStatus({ paid_at: null, due_date: null }, "2026-10-19"), "pending");
});
test("due dates keep their calendar day without timezone shifts", () => {
  assert.equal(dueDateLabel("2026-10-19"), "19/10/2026");
});