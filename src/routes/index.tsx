import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, MessageCircle, ShieldCheck, Loader2 } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { COLORS, COUNTRY_CODES, TYPE_VEHICULES, chauffeurSchema, whatsappShareUrl } from "@/lib/chauffeur";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recensement des chauffeurs – Jeux Olympiques" },
      { name: "description", content: "Formulaire officiel de recensement des chauffeurs et de leurs véhicules pour les Jeux Olympiques." },
      { property: "og:title", content: "Recensement des chauffeurs – Jeux Olympiques" },
      { property: "og:description", content: "Inscrivez-vous en 1 minute : vos informations et celles de votre véhicule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const selectCls =
  "flex h-12 w-full rounded-lg border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const inputCls = "h-12 rounded-lg bg-card text-base focus-visible:ring-2";

function shareOnWhatsApp() {
  window.open(whatsappShareUrl(window.location.origin + "/"), "_blank", "noopener");
}

function Index() {
  const [form, setForm] = useState({
    prenom: "", nom: "", matricule_vehicule: "", type_vehicule: "", couleur: "", couleur_autre: "",
    indicatif: "+221", numero: "", consent: false, website: "",
  });
  const [errors, setErrors] = useState<Partial<Record<"prenom"|"nom"|"matricule_vehicule"|"type_vehicule"|"couleur"|"couleur_autre"|"numero"|"consent", string>>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (form.website) { setDone(true); return; } // honeypot
    const parsed = chauffeurSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {} as Record<string, string>;
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] ??= i.message; });
      setErrors(errs as typeof errors);
      return;
    }
    setErrors({});
    setLoading(true);
    const d = parsed.data;
    const { error } = await supabase.from("chauffeurs").insert({
      prenom: d.prenom,
      nom: d.nom.toUpperCase(),
      matricule_vehicule: d.matricule_vehicule,
      type_vehicule: d.type_vehicule,
      couleur_vehicule: d.couleur === "Autre" ? d.couleur_autre! : d.couleur,
      telephone: d.indicatif + d.numero.replace(/^0+/, ""),
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") setServerError("Ce matricule est déjà enregistré.");
      else if (error.message.includes("Trop")) setServerError(error.message);
      else setServerError("L'enregistrement a échoué. Vérifiez vos informations et réessayez.");
      return;
    }
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="relative overflow-hidden">
        <img src={heroImg} alt="Flotte de véhicules devant le stade" width={1600} height={912}
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero" />
        <div className="relative mx-auto max-w-2xl px-5 pb-28 pt-10 text-primary-foreground">
          <div className="flag-stripe mb-6 h-1.5 w-20 rounded-full" />
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Campagne officielle</p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-5xl">
            Recensement des chauffeurs – Jeux Olympiques
          </h1>
          <p className="mt-4 max-w-xl text-base opacity-90">
            Dans le cadre de l'organisation des Jeux Olympiques, nous recensons les chauffeurs et leurs
            véhicules afin de planifier le transport des délégations et du public. L'inscription prend moins d'une minute.
          </p>
        </div>
      </header>

      <section className="relative mx-auto -mt-20 max-w-2xl px-4 pb-16">
        <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
              <h2 className="mt-4 text-2xl font-extrabold">Inscription enregistrée !</h2>
              <p className="mt-2 text-muted-foreground">
                Votre inscription a été enregistrée avec succès. Merci pour votre participation au recensement des chauffeurs Gocab pour les Jeux Olympiques.
              </p>
              <div className="mt-6 space-y-3">
                <Button variant="whatsapp" size="xl" onClick={shareOnWhatsApp}>
                  <MessageCircle /> Partager sur WhatsApp
                </Button>
                <Button variant="ghost" onClick={() => { setDone(false); setForm((f) => ({ ...f, prenom: "", nom: "", matricule_vehicule: "", type_vehicule: "", numero: "", couleur: "", couleur_autre: "", consent: false })); }}>
                  Inscrire un autre chauffeur
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <h2 className="text-xl font-extrabold">Vos informations</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Prénom *" error={errors.prenom}>
                  <Input className={inputCls} autoComplete="given-name" value={form.prenom} maxLength={80}
                    onChange={(e) => set("prenom", e.target.value)} />
                </Field>
                <Field label="Nom *" error={errors.nom}>
                  <Input className={inputCls} autoComplete="family-name" value={form.nom} maxLength={80}
                    onChange={(e) => set("nom", e.target.value)} />
                </Field>
              </div>
              <Field label="Matricule du véhicule *" error={errors.matricule_vehicule}>
                <Input className={`${inputCls} uppercase`} placeholder="DK-1234-AB" value={form.matricule_vehicule} maxLength={20}
                  onChange={(e) => set("matricule_vehicule", e.target.value)} />
              </Field>
              <Field label="Type de véhicule *" error={errors.type_vehicule}>
                <select className={selectCls} value={form.type_vehicule} onChange={(e) => set("type_vehicule", e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {TYPE_VEHICULES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Couleur du véhicule *" error={errors.couleur || errors.couleur_autre}>
                <select className={selectCls} value={form.couleur} onChange={(e) => set("couleur", e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {COLORS.map((c) => <option key={c}>{c}</option>)}
                </select>
                {form.couleur === "Autre" && (
                  <Input className={`${inputCls} mt-2`} placeholder="Précisez la couleur" value={form.couleur_autre} maxLength={40}
                    onChange={(e) => set("couleur_autre", e.target.value)} />
                )}
              </Field>
              <Field label="Numéro de téléphone *" error={errors.numero}>
                <div className="flex min-w-0 items-stretch gap-2">
                  <Select value={form.indicatif} onValueChange={(v) => set("indicatif", v)}>
                    <SelectTrigger aria-label="Indicatif du pays" className={`${selectCls} h-14 w-[6.25rem] shrink-0 px-2 text-base`}>
                      <span className="truncate">{COUNTRY_CODES.find((c) => c.code === form.indicatif)?.short ?? form.indicatif}</span>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRY_CODES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input aria-label="Numéro de téléphone" className={`${inputCls} h-14 min-w-0 flex-1 text-lg tracking-wide`} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="77 123 45 67"
                    value={form.numero} maxLength={16} onChange={(e) => set("numero", e.target.value)} />
                </div>
              </Field>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"
                value={form.website} onChange={(e) => set("website", e.target.value)} name="website" />

              <label className="flex items-start gap-3 rounded-lg bg-muted p-4 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)} />
                <span>
                  J'accepte que mes données soient utilisées uniquement pour le recensement et l'organisation du
                  transport des Jeux Olympiques. Elles ne seront accessibles qu'aux personnes autorisées.
                  {errors.consent && <span className="mt-1 block font-semibold text-destructive">{errors.consent}</span>}
                </span>
              </label>

              {serverError && <p className="rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">{serverError}</p>}

              <Button type="submit" variant="hero" size="xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : null} Enregistrer mon inscription
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Données sécurisées et confidentielles
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 rounded-2xl border bg-card p-5 text-center">
          <p className="text-sm font-semibold">Vous connaissez d'autres chauffeurs ?</p>
          <Button variant="whatsapp" size="xl" className="mt-3" onClick={shareOnWhatsApp}>
            <MessageCircle /> Partager sur WhatsApp
          </Button>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <a href="/admin/login" className="underline-offset-4 hover:underline">Espace administrateur</a>
        </p>
      </section>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
