import { test } from "node:test";
import { strict as assert } from "node:assert";
import { deleteRegisteredUnit } from "./unit-deletion";

test("admin deletion targets only the selected registered unit", async () => {
  const calls: unknown[] = [];
  await deleteRegisteredUnit({ rpc: async (name, args) => {
    calls.push({ name, args });
    return { error: null };
  } }, "b22654c1-112a-4d65-9a68-e2ef3bd609e7");
  assert.deepEqual(calls, [{ name: "delete_unit", args: { _unit_id: "b22654c1-112a-4d65-9a68-e2ef3bd609e7" } }]);
});

test("a denied unit deletion is never reported as successful", async () => {
  await assert.rejects(deleteRegisteredUnit({ rpc: async () => ({ error: { message: "Acesso negado" } }) }, "b22654c1-112a-4d65-9a68-e2ef3bd609e7"), /Acesso negado/);
});