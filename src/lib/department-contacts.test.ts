import { test } from "node:test";
import { strict as assert } from "node:assert";
import { departmentContactSchema, phoneContactUrl, whatsappContactUrl } from "./department-contacts";

test("a sector preserves independently entered phone, WhatsApp and email", () => {
  assert.deepEqual(departmentContactSchema.parse({ name: " Financeiro ", phone: "(11) 3333-4444", whatsapp: "+55 11 99999-8888", email: "financeiro@example.com" }), {
    name: "Financeiro", phone: "(11) 3333-4444", whatsapp: "+55 11 99999-8888", email: "financeiro@example.com",
  });
});
test("a sector requires its name and at least one contact", () => {
  assert.equal(departmentContactSchema.safeParse({ name: "", phone: "", whatsapp: "", email: "" }).success, false);
  assert.equal(departmentContactSchema.safeParse({ name: "Financeiro", phone: "", whatsapp: "", email: "" }).success, false);
  assert.equal(departmentContactSchema.safeParse({ name: "Financeiro", phone: "", whatsapp: "", email: "financeiro@example.com" }).success, true);
});
test("contact links support Brazilian DDD and explicit international numbers", () => {
  assert.equal(phoneContactUrl("(11) 3333-4444"), "tel:1133334444");
  assert.equal(whatsappContactUrl("(11) 99999-8888"), "https://wa.me/5511999998888");
  assert.equal(whatsappContactUrl("+351 912 345 678"), "https://wa.me/351912345678");
});