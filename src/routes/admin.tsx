import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Download, LogOut, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { STATUTS } from "@/lib/chauffeur";

type Chauffeur = Tables<"chauffeurs">;

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Espace administrateur – Recensement des chauffeurs" },
      { name: "description", content: "Tableau de bord sécurisé de gestion des inscriptions des chauffeurs." },
      { property: "og:title", content: "Espace administrateur – Recensement des chauffeurs" },
      { property: "og:description", content: "Gestion sécurisée des inscriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin")
      .then(({ data }) => setIsAdmin(!!data?.length));
  }, [session]);

  if (!ready) return <Center><Loader2 className="animate-spin" /></Center>;
  if (!session) return <Login />;
  if (isAdmin === null) return <Center><Loader2 className="animate-spin" /></Center>;
  if (!isAdmin)
    return (
      <Center>
        <p className="font-semibold">Accès refusé : ce compte n'est pas administrateur.</p>
        <Button variant="outline" className="mt-4" onClick={() => supabase.auth.signOut()}>Se déconnecter</Button>
      </Center>
    );
  return <Dashboard />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">{children}</div>;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Identifiants invalides");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin + "/admin" },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Compte créé. Confirmez votre adresse email puis connectez-vous.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-7 shadow-card">
        <div className="flag-stripe h-1.5 w-16 rounded-full" />
        <h1 className="text-2xl font-black uppercase">Espace administrateur</h1>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label>Mot de passe</Label>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <Button type="submit" variant="hero" size="xl" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} {mode === "in" ? "Se connecter" : "Créer le compte"}
        </Button>
        <button type="button" className="w-full text-sm text-muted-foreground hover:underline"
          onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Première utilisation ? Créer le compte administrateur" : "Déjà un compte ? Se connecter"}
        </button>
      </form>
    </div>
  );
}

const statusStyle: Record<string, string> = {
  "En attente": "bg-warning/20 text-warning-foreground",
  "Validé": "bg-success/15 text-success",
  "Rejeté": "bg-destructive/15 text-destructive",
};

function Dashboard() {
  const [rows, setRows] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Chauffeur | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("chauffeurs").select("*").order("date_inscription", { ascending: false });
    if (error) toast.error("Chargement impossible");
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statut && r.statut !== statut) return false;
      const d = r.date_inscription.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!s) return true;
      return [r.nom, r.prenom, r.matricule_vehicule, r.telephone].some((v) => v.toLowerCase().includes(s));
    });
  }, [rows, q, statut, from, to]);

  const counts = useMemo(() => ({
    total: rows.length,
    attente: rows.filter((r) => r.statut === "En attente").length,
    valide: rows.filter((r) => r.statut === "Validé").length,
    rejete: rows.filter((r) => r.statut === "Rejeté").length,
  }), [rows]);

  async function updateStatut(id: string, s: string) {
    const { error } = await supabase.from("chauffeurs").update({ statut: s }).eq("id", id);
    if (error) { toast.error("Mise à jour impossible"); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, statut: s } : r)));
    toast.success("Statut mis à jour");
  }

  async function remove(r: Chauffeur) {
    if (!confirm(`Supprimer l'inscription de ${r.prenom} ${r.nom} ?`)) return;
    const { error } = await supabase.from("chauffeurs").delete().eq("id", r.id);
    if (error) { toast.error("Suppression impossible"); return; }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    toast.success("Inscription supprimée");
  }

  function exportCsv() {
    const head = ["Prénom", "Nom", "Matricule", "Couleur", "Téléphone", "Date d'inscription", "Statut"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = filtered.map((r) => [r.prenom, r.nom, r.matricule_vehicule, r.couleur_vehicule, r.telephone,
      new Date(r.date_inscription).toLocaleString("fr-FR"), r.statut].map(esc).join(";"));
    const blob = new Blob(["\uFEFF" + [head.map(esc).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chauffeurs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const field = "h-10 rounded-lg border border-input bg-card px-3 text-sm";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <div className="flag-stripe mb-2 h-1 w-12 rounded-full" />
            <h1 className="text-lg font-black uppercase sm:text-2xl">Recensement des chauffeurs</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={() => supabase.auth.signOut()}><LogOut /> Déconnexion</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total recensés" value={counts.total} className="bg-primary text-primary-foreground" />
          <Stat label="En attente" value={counts.attente} className="bg-card" />
          <Stat label="Validés" value={counts.valide} className="bg-card" />
          <Stat label="Rejetés" value={counts.rejete} className="bg-card" />
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 pl-9" placeholder="Nom, matricule ou téléphone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={field} value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className="text-xs text-muted-foreground">Du<input type="date" className={`${field} ml-1`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">Au<input type="date" className={`${field} ml-1`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <Button onClick={exportCsv}><Download /> Exporter (Excel/CSV)</Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                {["Prénom", "Nom", "Matricule", "Couleur", "Téléphone", "Date", "Statut", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucune inscription</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">{r.prenom}</td>
                  <td className="px-4 py-3 font-semibold">{r.nom}</td>
                  <td className="px-4 py-3 font-mono">{r.matricule_vehicule}</td>
                  <td className="px-4 py-3">{r.couleur_vehicule}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.telephone}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(r.date_inscription).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-4 py-3">
                    <select className={`rounded-full px-2 py-1 text-xs font-bold ${statusStyle[r.statut]}`} value={r.statut}
                      onChange={(e) => updateStatut(r.id, e.target.value)}>
                      {STATUTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEditing(r)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(r)}><Trash2 /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <EditDialog row={editing} onClose={() => setEditing(null)}
        onSaved={(r) => setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)))} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-1 font-display text-3xl font-black">{value}</p>
    </div>
  );
}

function EditDialog({ row, onClose, onSaved }: { row: Chauffeur | null; onClose: () => void; onSaved: (r: Chauffeur) => void }) {
  const [f, setF] = useState<Chauffeur | null>(row);
  useEffect(() => setF(row), [row]);
  if (!f) return null;
  const keys: [keyof Chauffeur, string][] = [["prenom", "Prénom"], ["nom", "Nom"], ["matricule_vehicule", "Matricule"], ["couleur_vehicule", "Couleur"], ["telephone", "Téléphone (+221…)"]];

  async function save() {
    if (!f) return;
    const { prenom, nom, matricule_vehicule, couleur_vehicule, telephone } = f;
    if (![prenom, nom, matricule_vehicule, couleur_vehicule].every((v) => v.trim()) || !/^\+\d{8,16}$/.test(telephone))
      { toast.error("Champs invalides"); return; }
    const { error } = await supabase.from("chauffeurs").update({
      prenom: prenom.trim(), nom: nom.trim(), matricule_vehicule: matricule_vehicule.trim().toUpperCase(),
      couleur_vehicule: couleur_vehicule.trim(), telephone,
    }).eq("id", f.id);
    if (error) { toast.error(error.code === "23505" ? "Matricule déjà utilisé" : "Enregistrement impossible"); return; }
    onSaved(f); onClose(); toast.success("Inscription modifiée");
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Modifier l'inscription</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {keys.map(([k, l]) => (
            <div key={k} className="space-y-1">
              <Label>{l}</Label>
              <Input value={String(f[k])} maxLength={80} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
