CREATE INDEX IF NOT EXISTS chauffeurs_nom_idx ON public.chauffeurs (lower(nom), lower(prenom));
CREATE INDEX IF NOT EXISTS chauffeurs_matricule_idx ON public.chauffeurs (matricule_vehicule);
CREATE INDEX IF NOT EXISTS chauffeurs_telephone_idx ON public.chauffeurs (telephone);
CREATE INDEX IF NOT EXISTS chauffeurs_date_idx ON public.chauffeurs (date_inscription DESC);
CREATE INDEX IF NOT EXISTS chauffeurs_statut_idx ON public.chauffeurs (statut);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chauffeurs_statut_check') THEN
    ALTER TABLE public.chauffeurs ADD CONSTRAINT chauffeurs_statut_check CHECK (statut IN ('En attente','Validé','Rejeté')) NOT VALID;
  END IF;
END $$;