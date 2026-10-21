import { test } from "node:test";
import { strict as assert } from "node:assert";
import { activeFilterUnits, terminationPendingItems, pendingItemsSignature } from "./unit-lifecycle";

test("unit filters exclude inactive units", () => {
  assert.deepEqual(activeFilterUnits([
    { id: "active", active: true, terminated_at: null },
    { id: "inactive", active: false, terminated_at: null },
  ]).map((u) => u.id), ["active"]);
});

test("unit filters exclude terminated units even if active is true", () => {
  assert.equal(activeFilterUnits([{ active: true, terminated_at: "2026-10-21T11:39:00Z" }]).length, 0);
});

test("termination reports all unpaid bills, including those without a due date", () => {
  const { bills } = terminationPendingItems([
    { id: "overdue", paid_at: null, due_date: "2026-10-01" },
    { id: "future", paid_at: null, due_date: "2026-11-01" },
    { id: "no-date", paid_at: null, due_date: null },
    { id: "paid", paid_at: "2026-10-20T12:00:00Z", due_date: "2026-10-01" },
  ], []);
  assert.deepEqual(bills.map((bill) => bill.id), ["overdue", "future", "no-date"]);
});

test("termination reports pending and in-progress orders, not completed or canceled ones", () => {
  const { orders } = terminationPendingItems([], [
    { id: "pending", status: "pendente" },
    { id: "progress", status: "em_andamento" },
    { id: "done", status: "concluido" },
    { id: "canceled", status: "cancelado" },
  ]);
  assert.deepEqual(orders.map((order) => order.id), ["pending", "progress"]);
});

test("a new pending item invalidates acknowledgment of the previous report", () => {
  assert.notEqual(pendingItemsSignature({ bills: [], orders: [] }), pendingItemsSignature({ bills: [{ id: "new" }], orders: [] }));
});