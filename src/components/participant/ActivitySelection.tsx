import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivitySelectionProps {
  userId: string;
}

export const ActivitySelection = ({ userId }: ActivitySelectionProps) => {
  const [rodadaAtual, setRodadaAtual] = useState<any>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [minhaVez, setMinhaVez] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participanteAtual, setParticipanteAtual] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRodadaAtual();
    
    // Realtime para mudanças na rodada
    const channel = supabase
      .channel('rodadas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rodadas'
        },
        () => {
          fetchRodadaAtual();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchRodadaAtual = async () => {
    // Buscar rodada ativa
    const { data: rodada } = await supabase
      .from("rodadas")
      .select("*, escalas(*)")
      .eq("finalizada", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!rodada) {
      setRodadaAtual(null);
      return;
    }

    setRodadaAtual(rodada);

    // Verificar se é minha vez
    const ordemAtual = rodada.ordem_sorteada[rodada.indice_atual];
    setMinhaVez(ordemAtual === userId);

    // Buscar nome do participante atual
    if (ordemAtual) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome_completo")
        .eq("id", ordemAtual)
        .single();
      
      setParticipanteAtual(profile);
    }

    // Buscar atividades disponíveis
    const { data: atividadesData } = await supabase
      .from("atividades")
      .select("*")
      .eq("escala_id", rodada.escala_id)
      .order("data")
      .order("horario_inicio");

    if (atividadesData) {
      setAtividades(atividadesData.filter(a => a.vagas_ocupadas < a.vagas_total));
    }
  };

  const escolherAtividade = async (atividadeId: string) => {
    if (!minhaVez || !rodadaAtual) return;
    setLoading(true);

    try {
      // Registrar escolha
      const { error: escolhaError } = await supabase.from("escolhas").insert({
        rodada_id: rodadaAtual.id,
        user_id: userId,
        atividade_id: atividadeId
      });

      if (escolhaError) throw escolhaError;

      // Avançar para próximo participante
      const proximoIndice = rodadaAtual.indice_atual + 1;
      const finalizada = proximoIndice >= rodadaAtual.ordem_sorteada.length;

      const { error: rodadaError } = await supabase
        .from("rodadas")
        .update({
          indice_atual: proximoIndice,
          finalizada
        })
        .eq("id", rodadaAtual.id);

      if (rodadaError) throw rodadaError;

      toast({
        title: "Escolha registrada!",
        description: "Sua atividade foi registrada com sucesso.",
      });

      fetchRodadaAtual();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar escolha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!rodadaAtual) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhuma rodada ativa no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rodada {rodadaAtual.numero}</CardTitle>
              <CardDescription>{rodadaAtual.escalas.nome}</CardDescription>
            </div>
            {minhaVez ? (
              <Badge className="bg-primary">Sua vez!</Badge>
            ) : (
              <Badge variant="secondary">Aguardando</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!minhaVez && participanteAtual && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              Vez de: <strong className="text-foreground">{participanteAtual.nome_completo}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {minhaVez && (
        <div className="space-y-3">
          <h3 className="font-semibold">Escolha uma atividade:</h3>
          {atividades.map((atividade) => (
            <Card key={atividade.id} className="hover:border-primary transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        atividade.tipo === "Plantão" ? "default" :
                        atividade.tipo === "Ambulatório" ? "secondary" : "outline"
                      }>
                        {atividade.tipo}
                      </Badge>
                      {atividade.eh_fim_semana && (
                        <Badge variant="destructive">Fim de Semana</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(atividade.data + "T00:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {atividade.horario_inicio} - {atividade.horario_fim}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {atividade.vagas_ocupadas}/{atividade.vagas_total} vagas ocupadas
                    </div>
                  </div>

                  <Button
                    onClick={() => escolherAtividade(atividade.id)}
                    disabled={loading}
                    size="sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Escolher
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {atividades.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma atividade disponível no momento
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
