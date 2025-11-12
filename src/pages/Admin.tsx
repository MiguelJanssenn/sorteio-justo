import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, ArrowLeft } from "lucide-react";
import { ScaleForm } from "@/components/admin/ScaleForm";
import { ActivityForm } from "@/components/admin/ActivityForm";
import { BulkActivityImport } from "@/components/admin/BulkActivityImport";
import { RoundManager } from "@/components/admin/RoundManager";
import { RulesConfig } from "@/components/admin/RulesConfig";

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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="escalas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="escalas">Escalas</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
            <TabsTrigger value="rodadas">Rodadas</TabsTrigger>
            <TabsTrigger value="regras">Regras</TabsTrigger>
          </TabsList>

          <TabsContent value="escalas" key={`escalas-${refreshKey}`}>
            <ScaleForm onSuccess={handleRefresh} />
          </TabsContent>

          <TabsContent value="atividades" key={`atividades-${refreshKey}`} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ActivityForm onSuccess={handleRefresh} />
            </div>
            <BulkActivityImport onSuccess={handleRefresh} />
          </TabsContent>

          <TabsContent value="rodadas" key={`rodadas-${refreshKey}`}>
            <RoundManager />
          </TabsContent>

          <TabsContent value="regras" key={`regras-${refreshKey}`}>
            <RulesConfig />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
