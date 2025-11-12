import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Escala {
  id: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  status: string;
}

interface Participacao {
  id: string;
  escala_id: string;
  ativo: boolean;
}

export const ParticipacaoEscala = () => {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchEscalas(), fetchParticipacoes()]);
  };

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .eq("status", "ativa")
      .order("periodo_inicio", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const fetchParticipacoes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("participacao_escalas" as any)
      .select("*")
      .eq("user_id", user.id);
    
    if (data) setParticipacoes(data as any);
  };

  const isParticipando = (escalaId: string): boolean => {
    const participacao = participacoes.find(p => p.escala_id === escalaId);
    return participacao?.ativo ?? false;
  };

  const hasParticipacao = (escalaId: string): boolean => {
    return participacoes.some(p => p.escala_id === escalaId);
  };

  const toggleParticipacao = async (escalaId: string) => {
    setLoading(escalaId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const participando = isParticipando(escalaId);
      
      if (hasParticipacao(escalaId)) {
        // Atualizar participação existente
        const { error } = await supabase
          .from("participacao_escalas" as any)
          .update({ ativo: !participando })
          .eq("user_id", user.id)
          .eq("escala_id", escalaId);

        if (error) throw error;
      } else {
        // Criar nova participação
        const { error } = await supabase
          .from("participacao_escalas" as any)
          .insert({
            user_id: user.id,
            escala_id: escalaId,
            ativo: true
          });

        if (error) throw error;
      }

      toast({
        title: participando ? "Participação desativada" : "Participação ativada",
        description: participando 
          ? "Você não será incluído nas próximas rodadas desta escala."
          : "Você será incluído no sorteio das próximas rodadas desta escala.",
      });

      await fetchParticipacoes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Participação nas Escalas
        </CardTitle>
        <CardDescription>
          Escolha em quais escalas você deseja participar do sorteio de atividades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {escalas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma escala ativa no momento
          </div>
        ) : (
          <div className="space-y-3">
            {escalas.map((escala) => {
              const participando = isParticipando(escala.id);
              
              return (
                <div
                  key={escala.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{escala.nome}</h3>
                      {participando && (
                        <Badge variant="secondary" className="gap-1">
                          <UserCheck className="w-3 h-3" />
                          Participando
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(escala.periodo_inicio + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      {" - "}
                      {format(new Date(escala.periodo_fim + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <Button
                    variant={participando ? "outline" : "default"}
                    onClick={() => toggleParticipacao(escala.id)}
                    disabled={loading === escala.id}
                  >
                    {loading === escala.id ? (
                      "Processando..."
                    ) : participando ? (
                      <>
                        <UserX className="w-4 h-4 mr-2" />
                        Sair
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Participar
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">ℹ️ Como funciona:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Clique em "Participar" para ser incluído no sorteio das rodadas</li>
            <li>Você pode sair a qualquer momento clicando em "Sair"</li>
            <li>Apenas participantes ativos serão sorteados nas próximas rodadas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
