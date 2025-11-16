import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, ArrowLeft } from "lucide-react";
import { EmailsAutorizados } from "@/components/admin/EmailsAutorizados";
import { ParticipantesAtivos } from "@/components/admin/ParticipantesAtivos";
import { ModelosManager } from "@/components/admin/ModelosManager";
import { TiposAtividadeManager } from "@/components/admin/TiposAtividadeManager";
import { SubgruposConfigurator } from "@/components/admin/SubgruposConfigurator";
import { EscalaManual } from "@/components/admin/EscalaManual";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Erro ao verificar roles:", error);
        toast({
          title: "Erro ao verificar permissões",
          description: error.message,
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const hasAdminRole = rolesData?.some(r => r.role === "admin");
      
      if (!hasAdminRole) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta área.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    } catch (error: any) {
      console.error("Erro na verificação de admin:", error);
      toast({
        title: "Erro ao carregar painel",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Painel Admin</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Tabs defaultValue="modelos" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5">
              <TabsTrigger value="modelos" className="text-xs sm:text-sm whitespace-nowrap">Modelos</TabsTrigger>
              <TabsTrigger value="subgrupos" className="text-xs sm:text-sm whitespace-nowrap">Subgrupos</TabsTrigger>
              <TabsTrigger value="manual" className="text-xs sm:text-sm whitespace-nowrap">Escala Manual</TabsTrigger>
              <TabsTrigger value="participantes" className="text-xs sm:text-sm whitespace-nowrap">Participantes</TabsTrigger>
              <TabsTrigger value="emails" className="text-xs sm:text-sm whitespace-nowrap">Emails</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="modelos" key={`modelos-${refreshKey}`}>
            <ModelosManager />
          </TabsContent>

          <TabsContent value="subgrupos" key={`subgrupos-${refreshKey}`}>
            <SubgruposConfigurator />
          </TabsContent>

          <TabsContent value="manual" key={`manual-${refreshKey}`}>
            <EscalaManual />
          </TabsContent>

          <TabsContent value="participantes" key={`participantes-${refreshKey}`}>
            <ParticipantesAtivos />
          </TabsContent>

          <TabsContent value="emails" key={`emails-${refreshKey}`}>
            <EmailsAutorizados />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
