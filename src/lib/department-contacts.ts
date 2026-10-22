import { z } from "zod";

const contactNumber = z.string().trim().max(40, "Use até 40 caracteres").refine(
  (value) => !value || /^[+\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 8,
  "Informe um número válido com DDD",
);
export const departmentContactSchema = z.object({
  name: z.string().trim().min(1, "Informe o setor").max(120, "Use até 120 caracteres"),
  phone: contactNumber,
  whatsapp: contactNumber,
  email: z.string().trim().max(255).refine((value) => !value || z.string().email().safeParse(value).success, "Informe um e-mail válido"),
}).refine((value) => Boolean(value.phone || value.whatsapp || value.email), {
  message: "Informe pelo menos um contato do setor",
});
export type DepartmentContactForm = z.infer<typeof departmentContactSchema>;
export const emptyDepartmentContact: DepartmentContactForm = { name: "", phone: "", whatsapp: "", email: "" };
export function phoneContactUrl(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
export function whatsappContactUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // Local Brazilian numbers include DDD; international numbers include country code.
  return `https://wa.me/${digits.length === 10 || digits.length === 11 ? `55${digits}` : digits}`;
}