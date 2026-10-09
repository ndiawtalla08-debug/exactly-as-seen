import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2, Loader2, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUTS } from "@/lib/chauffeur";
import { DetailDialog, EditDialog, exportCsv, fmtDate, statusStyle, type Chauffeur } from "@/components/admin/shared";

export const Route = createFileRoute("/admin/chauffeurs")({
  head: () => ({ meta: [{ title: "Chauffeurs – Administration" }, { name: "robots", content: "noindex" }] }),
  component: Chauffeurs,
});

const PER_PAGE = 20;

function Chauffeurs() {
  const [rows, setRows] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Chauffeur | null>(null);
  const [viewing, setViewing] = useState<Chauffeur | null>(null);

  useEffect(() => {
    supabase.from("chauffeurs").select("*").order("date_inscription", { ascending: false }).then(({ data, error }) => {
      if (error) toast.error("Chargement impossible");
      setRows(data ?? []); setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sd = s.replace(/\s/g, "");
    return rows.filter((r) => {
      if (statut && r.statut !== statut) return false;
      const d = r.date_inscription.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!s) return true;
      return [`${r.prenom} ${r.nom}`, `${r.nom} ${r.prenom}`, r.matricule_vehicule].some((v) => v.toLowerCase().includes(s))
        || (sd.length > 0 && r.telephone.includes(sd));
    });
  }, [rows, q, statut, from, to]);
  useEffect(() => setPage(1), [q, statut, from, to]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const shown = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function updateStatut(id: string, s: string) {
    const { error } = await supabase.from("chauffeurs").update({ statut: s }).eq("id", id);
    if (error) { toast.error("Mise à jour impossible"); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, statut: s } : r)));
    setViewing((v) => (v && v.id === id ? { ...v, statut: s } : v));
    toast.success("Statut mis à jour");
  }

  async function remove(r: Chauffeur) {
    if (!confirm(`Supprimer définitivement l'inscription de ${r.prenom} ${r.nom} ?`)) return;
    const { error } = await supabase.from("chauffeurs").delete().eq("id", r.id);
    if (error) { toast.error("Suppression impossible"); return; }
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    toast.success("Inscription supprimée");
  }

  const field = "h-10 rounded-lg border border-input bg-card px-3 text-sm";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase">Chauffeurs <span className="text-muted-foreground">({filtered.length})</span></h1>
        <Button onClick={() => exportCsv(filtered)}><Download /> Exporter les données</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-10 pl-9" placeholder="Prénom, nom, matricule ou téléphone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={field} value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="text-xs text-muted-foreground">Du<input type="date" className={`${field} ml-1`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs text-muted-foreground">Au<input type="date" className={`${field} ml-1`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>{["Prénom", "Nom", "Matricule", "Type", "Couleur", "Téléphone", "Date", "Statut", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-8 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Aucune inscription</td></tr>
            ) : shown.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">{r.prenom}</td>
                <td className="px-4 py-3 font-semibold">{r.nom}</td>
                <td className="px-4 py-3 font-mono">{r.matricule_vehicule}</td>
                <td className="px-4 py-3 font-semibold">{r.type_vehicule}</td>
                <td className="px-4 py-3">{r.couleur_vehicule}</td>
                <td className="whitespace-nowrap px-4 py-3">{r.telephone}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmtDate(r.date_inscription)}</td>
                <td className="px-4 py-3">
                  <select className={`rounded-full px-2 py-1 text-xs font-bold ${statusStyle[r.statut]}`} value={r.statut}
                    onChange={(e) => updateStatut(r.id, e.target.value)}>
                    {STATUTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Button size="icon" variant="ghost" aria-label="Voir le dossier" onClick={() => setViewing(r)}><Eye /></Button>
                  <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEditing(r)}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(r)}><Trash2 /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Précédent</Button>
          <span>Page {page} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(page + 1)}>Suivant</Button>
        </div>
      )}

      <DetailDialog row={viewing} onClose={() => setViewing(null)} onStatut={updateStatut} />
      <EditDialog row={editing} onClose={() => setEditing(null)}
        onSaved={(r) => setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)))} />
    </div>
  );
}
