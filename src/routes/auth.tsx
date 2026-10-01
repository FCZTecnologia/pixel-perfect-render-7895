import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Condomio" },
      { name: "description", content: "Acesse o painel do administrador ou do condômino." },
      { property: "og:title", content: "Entrar — Condomio" },
      { property: "og:description", content: "Acesse o painel do condomínio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "first" | "forgot";
const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const r = z.string().trim().email().safeParse(email);
        if (!r.success) throw new Error("E-mail inválido");
        const { error } = await supabase.auth.resetPasswordForEmail(r.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link para redefinir sua senha.");
        return;
      }
      const parsed = schema.safeParse({ email, password });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (mode === "first") {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Confirme seu e-mail para ativar o acesso.");
          setMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw new Error("E-mail ou senha incorretos");
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, [string, string]> = {
    login: ["Entrar", "Use o e-mail cadastrado na sua unidade."],
    first: ["Primeiro acesso", "Crie sua senha usando o e-mail informado pela administração."],
    forgot: ["Recuperar senha", "Enviaremos um link para o seu e-mail."],
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <Brand subtitle="Gestão de condomínios" />
        <h1 className="mt-8 text-2xl font-semibold">{titles[mode][0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{titles[mode][1]}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="glass-strong" required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="pw">{mode === "first" ? "Crie uma senha" : "Senha"}</Label>
              <Input id="pw" type="password" autoComplete={mode === "first" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="glass-strong" required />
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "first" ? "Criar senha" : "Enviar link"}
          </Button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "login" ? (
            <button className="text-primary" onClick={() => setMode("login")}>Voltar para entrar</button>
          ) : (
            <>
              <button className="text-primary" onClick={() => setMode("first")}>Primeiro acesso</button>
              <button className="text-muted-foreground" onClick={() => setMode("forgot")}>Esqueci a senha</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
