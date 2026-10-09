ALTER TABLE public.chauffeurs ADD COLUMN type_vehicule text NOT NULL DEFAULT 'KAIVI';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chauffeurs TO authenticated;
GRANT ALL ON public.chauffeurs TO service_role;
GRANT INSERT ON public.chauffeurs TO anon, authenticated;