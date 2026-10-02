import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("claim_admin_if_none");
    return { user: data.user, isAdmin: Boolean(isAdmin) };
  },
  component: Shell,
});

const adminNav = [
  { to: "/dashboard", label: "Visão geral" },
  { to: "/unidades", label: "Unidades" },
  { to: "/consumo", label: "Consumo" },
  { to: "/ordens", label: "Ordens de serviço" },
  { to: "/avisos", label: "Avisos" },
  { to: "/sugestoes", label: "Sugestões" },
] as const;
const tenantNav = [
  { to: "/dashboard", label: "Visão geral" },
  { to: "/consumo", label: "Contas de consumo" },
  { to: "/ordens", label: "Ordens de serviço" },
  { to: "/avisos", label: "Avisos" },
  { to: "/sugestoes", label: "Sugestões" },
] as const;

function Shell() {
  const { user, isAdmin } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const nav = isAdmin ? adminNav : tenantNav;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-5 border-r border-glass-border bg-sidebar p-5 backdrop-blur-xl lg:flex">
        <Brand subtitle={isAdmin ? "Painel Administrativo" : "Painel do Condômino"} />
        <nav className="mt-2 flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-foreground/60 hover:bg-glass"
              activeProps={{ className: "!border-glass-border bg-sidebar-accent !text-foreground font-medium shadow-sm" }}
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-foreground/20"} />
                  {n.label}
                </>
              )}
            </Link>
          ))}
        </nav>
        <div className="glass-strong mt-auto rounded-2xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">{isAdmin ? "Administrador" : "Condômino"}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{user.email}</div>
          <Button variant="ink" size="sm" className="mt-3 w-full" onClick={signOut}>Sair</Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-glass-border bg-sidebar px-4 py-3 backdrop-blur-xl lg:hidden">
          <Brand />
          <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 py-2 lg:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-foreground/60" activeProps={{ className: "glass-strong !text-foreground font-medium" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
