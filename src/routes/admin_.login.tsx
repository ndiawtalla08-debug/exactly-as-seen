import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion administrateur – Recensement des chauffeurs" },
      { name: "description", content: "Connexion à l'espace administrateur du recensement." },
      { property: "og:title", content: "Connexion administrateur" },
      { property: "og:description", content: "Accès réservé aux administrateurs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        toast.success("Si ce compte existe, un e-mail de réinitialisation a été envoyé.");
        setMode("in");
      } else if (mode === "in") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { toast.error(error.status === 429 ? "Trop de tentatives, réessayez plus tard" : "Identifiants invalides"); return; }
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
        if (!isAdmin) { await supabase.auth.signOut(); toast.error("Accès refusé : ce compte n'est pas administrateur."); return; }
        navigate({ to: "/admin/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin/login` } });
        if (error) toast.error(error.message);
        else if (!data.session) toast.success("Compte créé. Confirmez votre adresse e-mail puis connectez-vous.");
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-7 shadow-card">
        <div className="flag-stripe h-1.5 w-16 rounded-full" />
        <h1 className="text-2xl font-black uppercase">{mode === "forgot" ? "Mot de passe oublié" : "Espace administrateur"}</h1>
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        </div>
        {mode !== "forgot" && (
          <div className="space-y-1.5">
            <Label htmlFor="pw">Mot de passe</Label>
            <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
          </div>
        )}
        <Button type="submit" variant="hero" size="xl" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} {mode === "in" ? "Se connecter" : mode === "up" ? "Créer le compte" : "Envoyer le lien"}
        </Button>
        <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
          {mode === "in" && <button type="button" className="hover:underline" onClick={() => setMode("forgot")}>Mot de passe oublié ?</button>}
          <button type="button" className="hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Première utilisation ? Créer le compte administrateur" : "Retour à la connexion"}
          </button>
        </div>
      </form>
    </div>
  );
}
