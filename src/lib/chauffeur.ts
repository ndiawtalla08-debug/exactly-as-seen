import { z } from "zod";

export const COUNTRY_CODES = [
  { code: "+221", label: "🇸🇳 Sénégal (+221)" },
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+223", label: "🇲🇱 Mali (+223)" },
  { code: "+224", label: "🇬🇳 Guinée (+224)" },
  { code: "+225", label: "🇨🇮 Côte d'Ivoire (+225)" },
  { code: "+222", label: "🇲🇷 Mauritanie (+222)" },
  { code: "+220", label: "🇬🇲 Gambie (+220)" },
  { code: "+245", label: "🇬🇼 Guinée-Bissau (+245)" },
  { code: "+212", label: "🇲🇦 Maroc (+212)" },
  { code: "+1", label: "🇺🇸 États-Unis (+1)" },
];

export const COLORS = [
  "Blanc", "Noir", "Gris", "Argent", "Bleu", "Rouge", "Vert", "Jaune", "Beige", "Marron", "Orange", "Autre",
];

export const STATUTS = ["En attente", "Validé", "Rejeté"] as const;
export type Statut = (typeof STATUTS)[number];

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est obligatoire`)
    .max(80, `${label} est trop long`)
    .regex(/^[\p{L}\s'.-]+$/u, `${label} contient des caractères invalides`);

export const chauffeurSchema = z
  .object({
    prenom: name("Le prénom"),
    nom: name("Le nom"),
    matricule_vehicule: z
      .string()
      .trim()
      .min(2, "Le matricule est obligatoire")
      .max(20, "Matricule trop long")
      .regex(/^[A-Za-z0-9\s-]+$/, "Matricule invalide (lettres, chiffres, tirets)")
      .transform((v) => v.toUpperCase().replace(/\s+/g, " ")),
    couleur: z.string().min(1, "Choisissez une couleur"),
    couleur_autre: z.string().trim().max(40).optional(),
    indicatif: z.string().regex(/^\+\d{1,4}$/),
    numero: z
      .string()
      .transform((v) => v.replace(/[\s.-]/g, ""))
      .pipe(z.string().regex(/^\d{6,12}$/, "Numéro de téléphone invalide")),
    consent: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter pour continuer" }) }),
  })
  .refine((d) => d.couleur !== "Autre" || (d.couleur_autre && d.couleur_autre.length > 0), {
    path: ["couleur_autre"],
    message: "Précisez la couleur",
  });

export function buildShareMessage(url: string) {
  return `Bonjour à tous,

Dans le cadre du recensement des chauffeurs pour les Jeux Olympiques, nous vous invitons à remplir le formulaire en ligne afin d'enregistrer vos informations personnelles et celles de votre véhicule.

Merci de renseigner toutes les informations demandées.

Lien du formulaire : ${url}

Merci pour votre collaboration.`;
}

export function whatsappShareUrl(url: string) {
  return `https://wa.me/?text=${encodeURIComponent(buildShareMessage(url))}`;
}
