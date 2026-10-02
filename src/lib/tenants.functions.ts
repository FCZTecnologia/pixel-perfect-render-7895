import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOGIN_DOMAIN = "condomio.app";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado");
}

export const setTenantLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        unitId: z.string().uuid(),
        username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, "Usuário: 3 a 40 letras, números, ponto, hífen"),
        password: z.string().min(6, "Senha com pelo menos 6 caracteres").max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: unit, error: ue } = await supabaseAdmin.from("units").select("*").eq("id", data.unitId).single();
    if (ue || !unit) throw new Error("Unidade não encontrada");
    if (unit.terminated_at) throw new Error("Contrato encerrado. Crie um novo cadastro.");
    const { data: taken } = await supabaseAdmin.from("units").select("id").ilike("username", data.username).neq("id", data.unitId);
    if (taken && taken.length) throw new Error("Este usuário já está em uso");
    const email = `${data.username}@${LOGIN_DOMAIN}`;

    let userId = unit.login_user_id as string | null;
    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email, password: data.password, email_confirm: true, ban_duration: "none" });
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password: data.password, email_confirm: true });
      if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar acesso");
      userId = created.user.id;
    }
    const { error } = await supabaseAdmin.from("units").update({ username: data.username, login_user_id: userId }).eq("id", data.unitId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const terminateUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ unitId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: unit } = await supabaseAdmin.from("units").select("login_user_id").eq("id", data.unitId).single();
    if (unit?.login_user_id) {
      await supabaseAdmin.auth.admin.updateUserById(unit.login_user_id, { ban_duration: "876000h" });
    }
    const { error } = await supabaseAdmin
      .from("units")
      .update({ active: false, terminated_at: new Date().toISOString() })
      .eq("id", data.unitId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
