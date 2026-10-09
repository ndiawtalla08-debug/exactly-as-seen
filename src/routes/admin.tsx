import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/admin/login" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw redirect({ to: "/admin/login" });
    }
    return { email: user.email ?? "" };
  },
  head: () => ({
    meta: [
      { title: "Espace administrateur – Recensement des chauffeurs" },
      { name: "description", content: "Espace sécurisé de gestion des inscriptions des chauffeurs." },
      { property: "og:title", content: "Espace administrateur – Recensement des chauffeurs" },
      { property: "og:description", content: "Gestion sécurisée des inscriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { email } = Route.useRouteContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") navigate({ to: "/admin/login", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const link = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold opacity-80 hover:bg-primary-foreground/10 hover:opacity-100";
  const nav = (
    <nav className="space-y-1" onClick={() => setOpen(false)}>
      <Link to="/admin/dashboard" className={link} activeProps={{ className: "bg-primary-foreground/15 !opacity-100" }}><LayoutDashboard className="h-4 w-4" /> Tableau de bord</Link>
      <Link to="/admin/chauffeurs" className={link} activeProps={{ className: "bg-primary-foreground/15 !opacity-100" }}><Users className="h-4 w-4" /> Chauffeurs</Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className={`${open ? "block" : "hidden"} bg-primary p-5 text-primary-foreground md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col`}>
        <div className="mb-8 hidden md:block">
          <div className="flag-stripe mb-2 h-1 w-12 rounded-full" />
          <p className="font-black uppercase leading-tight">Recensement<br />des chauffeurs</p>
        </div>
        {nav}
        <div className="mt-6 border-t border-primary-foreground/20 pt-4 md:mt-auto">
          <p className="mb-2 truncate text-xs opacity-70">{email}</p>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => supabase.auth.signOut()}><LogOut /> Déconnexion</Button>
        </div>
      </aside>
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground md:hidden">
        <p className="font-black uppercase">Administration</p>
        <Button size="icon" variant="ghost" aria-label="Menu" onClick={() => setOpen(!open)}><Menu /></Button>
      </header>
      <main className="flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
