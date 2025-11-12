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
  const [jaEscolheu, setJaEscolheu] = useState(false);
  const [escolhasPorAtividade, setEscolhasPorAtividade] = useState<Record<string, any[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchRodadaAtual();
    
    // Realtime para mudanças na rodada e escolhas
    const channel = supabase
      .channel('rodadas-escolhas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rodadas'
        },
        (payload) => {
          console.log('Mudança na rodada:', payload);
          fetchRodadaAtual();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escolhas'
        },
        (payload) => {
          console.log('Mudança nas escolhas:', payload);
          fetchRodadaAtual();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchRodadaAtual = async () => {
    console.log('Buscando rodada atual...');
    
    // Buscar rodada ativa
    const { data: rodada } = await supabase
      .from("rodadas")
      .select("*, escalas(*)")
      .eq("finalizada", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Rodada encontrada:', rodada);

    if (!rodada) {
      setRodadaAtual(null);
      return;
    }

    setRodadaAtual(rodada);

    // Verificar se já escolheu nesta rodada
    const { data: escolhaExistente } = await supabase
      .from("escolhas")
      .select("id")
      .eq("rodada_id", rodada.id)
      .eq("user_id", userId)
      .maybeSingle();

    setJaEscolheu(!!escolhaExistente);

    // Verificar se é minha vez
    const ordemAtual = rodada.ordem_sorteada[rodada.indice_atual];
    const ehMinhaVez = ordemAtual === userId;
    
    console.log('Índice atual da rodada:', rodada.indice_atual);
    console.log('Usuário atual na vez:', ordemAtual);
    console.log('Meu ID:', userId);
    console.log('É minha vez?', ehMinhaVez);
    
    setMinhaVez(ehMinhaVez);

    // Buscar nome do participante atual
    if (ordemAtual) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome_completo")
        .eq("id", ordemAtual)
        .maybeSingle();
      
      setParticipanteAtual(profile);
    }

    // Buscar TODAS as atividades (incluindo as já ocupadas)
    const { data: atividadesData } = await supabase
      .from("atividades")
      .select("*")
      .eq("escala_id", rodada.escala_id)
      .order("data")
      .order("horario_inicio");

    if (atividadesData) {
      setAtividades(atividadesData);
      
      // Buscar escolhas para cada atividade
      const { data: escolhasData } = await supabase
        .from("escolhas")
        .select("*, profiles(nome_completo)")
        .eq("rodada_id", rodada.id);
      
      // Organizar escolhas por atividade
      const escolhasPorAtiv: Record<string, any[]> = {};
      escolhasData?.forEach(escolha => {
        if (!escolhasPorAtiv[escolha.atividade_id]) {
          escolhasPorAtiv[escolha.atividade_id] = [];
        }
        escolhasPorAtiv[escolha.atividade_id].push(escolha);
      });
      
      setEscolhasPorAtividade(escolhasPorAtiv);
    }
  };

  const confirmarEscolha = async () => {
    if (!minhaVez || !rodadaAtual || !atividadeSelecionada || jaEscolheu) return;
    setLoading(true);

    try {
      console.log('Confirmando escolha para rodada:', rodadaAtual.id);
      
      // Verificar novamente se já escolheu (segurança)
      const { data: escolhaExistente } = await supabase
        .from("escolhas")
        .select("id")
        .eq("rodada_id", rodadaAtual.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (escolhaExistente) {
        toast({
          title: "Você já escolheu!",
          description: "Você já registrou uma escolha nesta rodada.",
          variant: "destructive",
        });
        setLoading(false);
        setJaEscolheu(true);
        return;
      }

      // Registrar escolha
      const { error: escolhaError } = await supabase.from("escolhas").insert({
        rodada_id: rodadaAtual.id,
        user_id: userId,
        atividade_id: atividadeSelecionada
      });

      if (escolhaError) {
        console.error('Erro ao registrar escolha:', escolhaError);
        throw escolhaError;
      }

      console.log('Escolha registrada com sucesso');

      // Avançar para próximo participante
      const proximoIndice = rodadaAtual.indice_atual + 1;
      const finalizada = proximoIndice >= rodadaAtual.ordem_sorteada.length;

      console.log('Atualizando rodada - índice atual:', rodadaAtual.indice_atual, '-> próximo:', proximoIndice, 'finalizada:', finalizada);

      const { error: rodadaError } = await supabase
        .from("rodadas")
        .update({
          indice_atual: proximoIndice,
          finalizada
        })
        .eq("id", rodadaAtual.id);

      if (rodadaError) {
        console.error('Erro ao atualizar rodada:', rodadaError);
        throw rodadaError;
      }

      console.log('Rodada atualizada com sucesso');

      if (finalizada) {
        toast({
          title: "Escolha registrada!",
          description: "Rodada finalizada! A próxima rodada será criada automaticamente.",
        });
      } else {
        toast({
          title: "Escolha registrada!",
          description: "Sua atividade foi registrada. Vez do próximo participante!",
        });
      }

      setAtividadeSelecionada(null);
      setJaEscolheu(true);
      
      // Forçar atualização imediata
      setTimeout(() => {
        fetchRodadaAtual();
      }, 500);
    } catch (error: any) {
      console.error('Erro geral:', error);
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

      {jaEscolheu && (
        <Card className="bg-muted">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-primary" />
            <p className="font-semibold text-lg">Você já escolheu uma atividade!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Aguarde a próxima rodada para fazer uma nova escolha.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {minhaVez && !jaEscolheu && (
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
        )}

        {!minhaVez && !jaEscolheu && (
          <div className="text-sm text-muted-foreground text-center py-2">
            Visualizando atividades disponíveis
          </div>
        )}

        <div className="space-y-2">
          {atividades.map((atividade) => {
            const isSelecionada = atividadeSelecionada === atividade.id;
            const vagasDisponiveis = atividade.vagas_ocupadas < atividade.vagas_total;
            const podeSelecionar = minhaVez && !jaEscolheu && vagasDisponiveis;
            const escolhasDestaAtividade = escolhasPorAtividade[atividade.id] || [];
            
            return (
              <Card 
                key={atividade.id} 
                className={`transition-all ${
                  !vagasDisponiveis 
                    ? "opacity-50 cursor-not-allowed" 
                    : podeSelecionar 
                      ? "cursor-pointer" 
                      : "cursor-default"
                } ${
                  isSelecionada 
                    ? "border-primary border-2 bg-primary/5" 
                    : podeSelecionar 
                      ? "hover:border-primary/50" 
                      : ""
                }`}
                onClick={() => podeSelecionar && setAtividadeSelecionada(atividade.id)}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2">
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
                          {!vagasDisponiveis && (
                            <Badge variant="outline" className="text-xs bg-muted">
                              Lotada
                            </Badge>
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

                        <div className={`flex items-center gap-1 text-xs ${
                          vagasDisponiveis ? "text-muted-foreground" : "text-destructive font-semibold"
                        }`}>
                          <Users className="w-3 h-3" />
                          {atividade.vagas_ocupadas}/{atividade.vagas_total}
                        </div>
                      </div>

                      {isSelecionada && (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    
                    {escolhasDestaAtividade.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        <span>Escolhida por:</span>
                        <span className="font-medium text-foreground">
                          {escolhasDestaAtividade.map((e: any) => e.profiles?.nome_completo).join(", ")}
                        </span>
                      </div>
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
    </div>
  );
};
