import { createFileRoute, Link } from "@tanstack/react-router";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Condomio — Gestão de condomínios comerciais, industriais e residenciais" },
      { name: "description", content: "Unidades, leituras de energia e água, faturas e ordens de serviço em um só painel para administradores e condôminos." },
      { property: "og:title", content: "Condomio — Gestão de condomínios" },
      { property: "og:description", content: "Unidades, consumo e ordens de serviço em um só painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const stats = [
  { k: "Unidades", v: "Galpões e salas " },
  { k: "Consumo", v: "Energia (kWh) e água (m³) por mês" },
  { k: "Ordens de serviço", v: "Chamados com status e respostas" },
];

function Index() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 lg:px-8">
      <header className="flex items-center justify-between">
        <Brand subtitle="Gestão de condomínos" />
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col justify-center py-16">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-primary">COMERCIAL · INDUSTRIAL </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-balance lg:text-6xl">
          O condomínio inteiro, em um painel claro.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Acesso ao painel condomino Bandeiras Empresarial
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg" variant="highlight">
            <Link to="/auth">Acessar o painel</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.k} className="glass rounded-2xl p-5">
              <div className="font-display font-semibold">{s.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
