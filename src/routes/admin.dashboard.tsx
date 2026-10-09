import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, fmtDate, type Chauffeur } from "@/components/admin/shared";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord – Administration" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [c, setC] = useState<{ total: number; attente: number; valide: number; rejete: number } | null>(null);
  const [recent, setRecent] = useState<Chauffeur[]>([]);

  useEffect(() => {
    const count = (s?: string) => {
      let q = supabase.from("chauffeurs").select("id", { count: "exact", head: true });
      if (s) q = q.eq("statut", s);
      return q.then((r) => r.count ?? 0);
    };
    Promise.all([count(), count("En attente"), count("Validé"), count("Rejeté")])
      .then(([total, attente, valide, rejete]) => setC({ total, attente, valide, rejete }));
    supabase.from("chauffeurs").select("*").order("date_inscription", { ascending: false }).limit(8)
      .then(({ data }) => setRecent(data ?? []));
  }, []);

  const cards = c ? [
    { l: "Total inscrits", v: c.total, I: Users, cls: "bg-primary text-primary-foreground" },
    { l: "En attente", v: c.attente, I: Clock, cls: "bg-card" },
    { l: "Validés", v: c.valide, I: CheckCircle2, cls: "bg-card" },
    { l: "Rejetés", v: c.rejete, I: XCircle, cls: "bg-card" },
  ] : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-black uppercase">Tableau de bord</h1>
      {!c ? <Loader2 className="animate-spin" /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ l, v, I, cls }) => (
            <div key={l} className={`rounded-2xl border p-5 ${cls}`}>
              <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase opacity-70">{l}</p><I className="h-5 w-5 opacity-60" /></div>
              <p className="mt-2 font-display text-4xl font-black">{v}</p>
              {c.total > 0 && l !== "Total inscrits" && (
                <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / c.total) * 100}%` }} /></div>
              )}
            </div>
          ))}
        </div>
      )}
      <section className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold">Dernières inscriptions</h2>
          <Link to="/admin/chauffeurs" className="text-sm font-semibold text-primary hover:underline">Voir tout</Link>
        </div>
        <ul className="divide-y">
          {recent.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Aucune inscription</li>}
          {recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div><p className="font-semibold">{r.prenom} {r.nom}</p><p className="font-mono text-xs text-muted-foreground">{r.matricule_vehicule} · {r.type_vehicule}</p></div>
              <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{fmtDate(r.date_inscription)}</span><StatusBadge s={r.statut} /></div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
