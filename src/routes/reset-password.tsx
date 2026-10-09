import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe – Recensement des chauffeurs" },
      { name: "description", content: "Définir un nouveau mot de passe administrateur." },
      { property: "og:title", content: "Nouveau mot de passe" },
      { property: "og:description", content: "Réinitialisation du mot de passe administrateur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { toast.error("Lien expiré ou invalide"); return; }
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/admin/dashboard" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-7 shadow-card">
        <h1 className="text-2xl font-black uppercase">Nouveau mot de passe</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Mot de passe (8 caractères min.)</Label>
          <Input id="pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="h-11" />
        </div>
        <Button type="submit" variant="hero" size="xl">Enregistrer</Button>
      </form>
    </div>
  );
}
