import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ClipboardList, RefreshCw, LogOut, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PromoteAdminButton } from "@/components/PromoteAdminButton";
import { ActivitySelection } from "@/components/participant/ActivitySelection";
import { ParticipacaoEscala } from "@/components/participant/ParticipacaoEscala";
import { VezAtual } from "@/components/participant/VezAtual";
import { RodadaStatus } from "@/components/participant/RodadaStatus";
import { EscalaAtivaCard } from "@/components/participant/EscalaAtivaCard";
import { MinhasAtividades } from "@/components/participant/MinhasAtividades";
import { RodadaAtualCard } from "@/components/participant/RodadaAtualCard";
import { MinhasEscolhas } from "@/components/participant/MinhasEscolhas";
import { SistemaTrocas } from "@/components/participant/SistemaTrocas";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Buscar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Verificar se é admin
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = rolesData?.some(r => r.role === "admin");
      setIsAdmin(hasAdminRole || false);

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Escalas de Internato</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo, {profile?.nome_completo}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && <PromoteAdminButton />}
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <EscalaAtivaCard />
          <MinhasAtividades />
          <RodadaAtualCard />
        </div>

        <Tabs defaultValue="participacao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="participacao">Participação</TabsTrigger>
            <TabsTrigger value="escolher">Escolher Atividades</TabsTrigger>
            <TabsTrigger value="minhas">Minhas Escolhas</TabsTrigger>
            <TabsTrigger value="trocas">Trocas</TabsTrigger>
          </TabsList>

          <TabsContent value="participacao" className="space-y-4">
            <VezAtual />
            <ParticipacaoEscala />
          </TabsContent>

          <TabsContent value="escolher" className="space-y-4">
            <VezAtual />
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <RodadaStatus />
              </div>
              <div>
                {user && <ActivitySelection userId={user.id} />}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="minhas" className="space-y-4">
            <MinhasEscolhas />
          </TabsContent>

          <TabsContent value="trocas" className="space-y-4">
            <SistemaTrocas />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;