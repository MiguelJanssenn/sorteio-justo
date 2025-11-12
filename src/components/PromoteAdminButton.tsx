import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const PromoteAdminButton = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePromote = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa estar logado");
      }

      const { data, error } = await supabase.functions.invoke('promote-first-admin', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.alreadyExists) {
        toast({
          title: "Não permitido",
          description: data.error,
          variant: "destructive",
        });
      } else if (data.success) {
        toast({
          title: "Sucesso!",
          description: data.message,
        });
        // Recarrega a página para atualizar as permissões
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao promover usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="w-4 h-4 mr-2" />
          Tornar-me Administrador
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tornar-se Administrador</AlertDialogTitle>
          <AlertDialogDescription>
            Como você é o primeiro usuário do sistema, pode se promover a administrador.
            Isso permitirá que você gerencie escalas, atividades e participantes.
            <br /><br />
            Esta ação só funciona se ainda não houver nenhum administrador cadastrado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handlePromote} disabled={loading}>
            {loading ? "Processando..." : "Confirmar Promoção"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};