CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

CREATE TABLE public.chauffeurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom text NOT NULL CHECK (char_length(prenom) BETWEEN 1 AND 80),
  nom text NOT NULL CHECK (char_length(nom) BETWEEN 1 AND 80),
  matricule_vehicule text NOT NULL CHECK (char_length(matricule_vehicule) BETWEEN 2 AND 20),
  couleur_vehicule text NOT NULL CHECK (char_length(couleur_vehicule) BETWEEN 1 AND 40),
  telephone text NOT NULL CHECK (telephone ~ '^\+[0-9]{8,16}$'),
  date_inscription timestamptz NOT NULL DEFAULT now(),
  statut text NOT NULL DEFAULT 'En attente' CHECK (statut IN ('En attente','Validé','Rejeté')),
  UNIQUE (matricule_vehicule)
);
GRANT INSERT ON public.chauffeurs TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.chauffeurs TO authenticated;
GRANT ALL ON public.chauffeurs TO service_role;
ALTER TABLE public.chauffeurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert pending" ON public.chauffeurs FOR INSERT TO anon, authenticated WITH CHECK (statut = 'En attente');
CREATE POLICY "admin select" ON public.chauffeurs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.chauffeurs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete" ON public.chauffeurs FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- anti-abuse: max 5 inscriptions per phone per day and global per-minute cap
CREATE OR REPLACE FUNCTION public.chauffeurs_rate_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.chauffeurs WHERE telephone = NEW.telephone AND date_inscription > now() - interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'Trop d''inscriptions pour ce numéro';
  END IF;
  IF (SELECT count(*) FROM public.chauffeurs WHERE date_inscription > now() - interval '1 minute') >= 30 THEN
    RAISE EXCEPTION 'Trop de requêtes, réessayez plus tard';
  END IF;
  NEW.statut := 'En attente';
  NEW.date_inscription := now();
  RETURN NEW;
END $$;
CREATE TRIGGER chauffeurs_rate BEFORE INSERT ON public.chauffeurs FOR EACH ROW EXECUTE FUNCTION public.chauffeurs_rate_limit();