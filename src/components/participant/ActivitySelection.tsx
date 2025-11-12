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
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<string | null>(null);
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
      .maybeSingle();

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
        .maybeSingle();
      
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

  const confirmarEscolha = async () => {
    if (!minhaVez || !rodadaAtual || !atividadeSelecionada) return;
    setLoading(true);

    try {
      // Registrar escolha
      const { error: escolhaError } = await supabase.from("escolhas").insert({
        rodada_id: rodadaAtual.id,
        user_id: userId,
        atividade_id: atividadeSelecionada
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

      if (finalizada) {
        toast({
          title: "Escolha registrada!",
          description: "Rodada finalizada! Aguarde a próxima rodada com novo sorteio.",
        });
      } else {
        toast({
          title: "Escolha registrada!",
          description: "Sua atividade foi registrada com sucesso.",
        });
      }

      setAtividadeSelecionada(null);
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Escolha uma atividade:</h3>
            {atividadeSelecionada && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setAtividadeSelecionada(null)}
                  variant="outline"
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarEscolha}
                  disabled={loading}
                  size="sm"
                  className="bg-primary"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Escolha
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {atividades.map((atividade) => {
              const isSelecionada = atividadeSelecionada === atividade.id;
              return (
                <Card 
                  key={atividade.id} 
                  className={`cursor-pointer transition-all ${
                    isSelecionada 
                      ? "border-primary border-2 bg-primary/5" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setAtividadeSelecionada(atividade.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex gap-2">
                          <Badge variant={
                            atividade.tipo === "Plantão" ? "default" :
                            atividade.tipo === "Ambulatório" ? "secondary" : "outline"
                          } className="text-xs">
                            {atividade.tipo}
                          </Badge>
                          {atividade.eh_fim_semana && (
                            <Badge variant="destructive" className="text-xs">FDS</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs flex-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(atividade.data + "T00:00:00"), "dd/MM", { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {atividade.horario_inicio}-{atividade.horario_fim}
                          </div>
                          {atividade.local && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              📍 {atividade.local}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {atividade.vagas_ocupadas}/{atividade.vagas_total}
                        </div>
                      </div>

                      {isSelecionada && (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

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
