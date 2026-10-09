CREATE TABLE public.chauffeur_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chauffeur_id uuid NOT NULL,
  action text NOT NULL,
  admin_id uuid,
  admin_email text,
  ancien jsonb,
  nouveau jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.chauffeur_historique (chauffeur_id, created_at DESC);
GRANT SELECT ON public.chauffeur_historique TO authenticated;
GRANT ALL ON public.chauffeur_historique TO service_role;
ALTER TABLE public.chauffeur_historique ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read history" ON public.chauffeur_historique FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.chauffeurs_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE act text; diff_old jsonb := '{}'; diff_new jsonb := '{}'; k text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.chauffeur_historique(chauffeur_id, action, admin_id, admin_email, ancien)
    VALUES (OLD.id, 'Suppression', auth.uid(), auth.jwt()->>'email', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    IF to_jsonb(NEW)->k IS DISTINCT FROM to_jsonb(OLD)->k THEN
      diff_old := diff_old || jsonb_build_object(k, to_jsonb(OLD)->k);
      diff_new := diff_new || jsonb_build_object(k, to_jsonb(NEW)->k);
    END IF;
  END LOOP;
  IF diff_new = '{}'::jsonb THEN RETURN NEW; END IF;
  act := CASE WHEN diff_new ? 'statut' AND (SELECT count(*) FROM jsonb_object_keys(diff_new)) = 1 THEN 'Changement de statut' ELSE 'Modification' END;
  INSERT INTO public.chauffeur_historique(chauffeur_id, action, admin_id, admin_email, ancien, nouveau)
  VALUES (NEW.id, act, auth.uid(), auth.jwt()->>'email', diff_old, diff_new);
  RETURN NEW;
END $$;
CREATE TRIGGER chauffeurs_audit_upd AFTER UPDATE ON public.chauffeurs FOR EACH ROW EXECUTE FUNCTION public.chauffeurs_audit();
CREATE TRIGGER chauffeurs_audit_del AFTER DELETE ON public.chauffeurs FOR EACH ROW EXECUTE FUNCTION public.chauffeurs_audit();
ALTER TABLE public.chauffeurs ADD CONSTRAINT chauffeurs_type_check CHECK (type_vehicule IN ('KAIVI','MG5')) NOT VALID;