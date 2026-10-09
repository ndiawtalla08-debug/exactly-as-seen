import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { STATUTS, TYPE_VEHICULES } from "@/lib/chauffeur";

export type Chauffeur = Tables<"chauffeurs">;
type Historique = Tables<"chauffeur_historique">;

export const statusStyle: Record<string, string> = {
  "En attente": "bg-warning/20 text-warning-foreground",
  "Validé": "bg-success/15 text-success",
  "Rejeté": "bg-destructive/15 text-destructive",
};

export function StatusBadge({ s }: { s: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[s]}`}>{s}</span>;
}

export const fmtDate = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export function exportCsv(rows: Chauffeur[]) {
  const head = ["Prénom", "Nom", "Matricule", "Type", "Couleur", "Téléphone", "Date d'inscription", "Statut"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.prenom, r.nom, r.matricule_vehicule, r.type_vehicule, r.couleur_vehicule, r.telephone,
    new Date(r.date_inscription).toLocaleString("fr-FR"), r.statut].map(esc).join(";"));
  const blob = new Blob(["\uFEFF" + [head.map(esc).join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `chauffeurs_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

const LABELS: Record<string, string> = {
  prenom: "Prénom", nom: "Nom", matricule_vehicule: "Matricule", type_vehicule: "Type", couleur_vehicule: "Couleur",
  telephone: "Téléphone", statut: "Statut",
};

export function DetailDialog({ row, onClose, onStatut }: { row: Chauffeur | null; onClose: () => void; onStatut: (id: string, s: string) => void }) {
  const [hist, setHist] = useState<Historique[] | null>(null);
  useEffect(() => {
    if (!row) return;
    setHist(null);
    supabase.from("chauffeur_historique").select("*").eq("chauffeur_id", row.id).order("created_at", { ascending: false })
      .then(({ data }) => setHist(data ?? []));
  }, [row?.id, row?.statut]);
  if (!row) return null;
  const info: [string, string][] = [["Prénom", row.prenom], ["Nom", row.nom], ["Matricule", row.matricule_vehicule],
    ["Type", row.type_vehicule], ["Couleur", row.couleur_vehicule], ["Téléphone", row.telephone], ["Inscrit le", fmtDate(row.date_inscription)]];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Dossier de {row.prenom} {row.nom}</DialogTitle></DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {info.map(([k, v]) => (<div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>))}
        </dl>
        <div className="space-y-1.5">
          <Label>Statut du dossier</Label>
          <div className="flex flex-wrap gap-2">
            {STATUTS.map((s) => (
              <Button key={s} size="sm" variant={row.statut === s ? "default" : "outline"} onClick={() => onStatut(row.id, s)}>{s}</Button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">Historique</h3>
          {hist === null ? <Loader2 className="animate-spin" /> : hist.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune modification.</p>
          ) : (
            <ul className="space-y-2">
              {hist.map((h) => (
                <li key={h.id} className="rounded-lg border p-2.5 text-xs">
                  <p className="font-semibold">{h.action} · {fmtDate(h.created_at)}</p>
                  <p className="text-muted-foreground">par {h.admin_email ?? h.admin_id ?? "système"}</p>
                  {h.nouveau && Object.entries(h.nouveau as Record<string, unknown>).map(([k, v]) => (
                    <p key={k}>{LABELS[k] ?? k} : <s className="text-muted-foreground">{String((h.ancien as Record<string, unknown>)?.[k] ?? "")}</s> → <b>{String(v)}</b></p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditDialog({ row, onClose, onSaved }: { row: Chauffeur | null; onClose: () => void; onSaved: (r: Chauffeur) => void }) {
  const [f, setF] = useState<Chauffeur | null>(row);
  useEffect(() => setF(row), [row]);
  if (!f) return null;
  const keys: [keyof Chauffeur, string][] = [["prenom", "Prénom"], ["nom", "Nom"], ["matricule_vehicule", "Matricule"], ["couleur_vehicule", "Couleur"], ["telephone", "Téléphone (+221…)"]];

  async function save() {
    if (!f) return;
    const { prenom, nom, matricule_vehicule, type_vehicule, couleur_vehicule, telephone } = f;
    if (![prenom, nom, matricule_vehicule, couleur_vehicule].every((v) => v.trim()) || !/^\+\d{8,16}$/.test(telephone))
      { toast.error("Champs invalides"); return; }
    const upd = { prenom: prenom.trim(), nom: nom.trim(), matricule_vehicule: matricule_vehicule.trim().toUpperCase(),
      type_vehicule, couleur_vehicule: couleur_vehicule.trim(), telephone };
    const { error } = await supabase.from("chauffeurs").update(upd).eq("id", f.id);
    if (error) { toast.error(error.code === "23505" ? "Matricule déjà utilisé" : "Enregistrement impossible"); return; }
    onSaved({ ...f, ...upd }); onClose(); toast.success("Inscription modifiée");
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
          <div className="space-y-1">
            <Label>Type de véhicule</Label>
            <select className="flex h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={f.type_vehicule}
              onChange={(e) => setF({ ...f, type_vehicule: e.target.value })}>
              {TYPE_VEHICULES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
