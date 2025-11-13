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
import { ResumoCard } from "@/components/participant/ResumoCard";
import { MinhasEscolhas } from "@/components/participant/MinhasEscolhas";
import { SistemaTrocas } from "@/components/participant/SistemaTrocas";
import { HistoricoEscalas } from "@/components/participant/HistoricoEscalas";

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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Escalas de Internato</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Bem-vindo, {profile?.nome_completo}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isAdmin && <PromoteAdminButton />}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="hidden sm:flex">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" size="icon" onClick={() => navigate("/admin")} className="sm:hidden">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <ResumoCard />
        </div>

        <Tabs defaultValue="participacao" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
            <TabsTrigger value="participacao" className="text-xs sm:text-sm">Participação</TabsTrigger>
            <TabsTrigger value="escolher" className="text-xs sm:text-sm">Escolher</TabsTrigger>
            <TabsTrigger value="minhas" className="text-xs sm:text-sm">Minhas</TabsTrigger>
            <TabsTrigger value="trocas" className="text-xs sm:text-sm">Trocas</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs sm:text-sm">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="participacao" className="space-y-4">
            <VezAtual />
            <ParticipacaoEscala />
          </TabsContent>

          <TabsContent value="escolher" className="space-y-4">
            <VezAtual />
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <RodadaStatus />
              </div>
              <div className="order-1 lg:order-2">
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

          <TabsContent value="historico" className="space-y-4">
            <HistoricoEscalas />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;