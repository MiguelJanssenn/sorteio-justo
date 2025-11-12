import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivitySelectionProps {
  userId: string;
}

interface AvancarRodadaResult {
  sucesso: boolean;
  rodada_finalizada: boolean;
  proximo_indice: number;
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
  const [ordemTipos, setOrdemTipos] = useState<string[] | null>(null);
  const [ocultarEscolhidas, setOcultarEscolhidas] = useState(true);
  const [rodadasPausadas, setRodadasPausadas] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
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
      setRodadasPausadas(false);
      return;
    }

    setRodadaAtual(rodada);
    setRodadasPausadas(rodada.escalas?.rodadas_pausadas || false);

    // Buscar regra de ordem por tipo
    const { data: regraOrdem } = await supabase
      .from("regras")
      .select("*")
      .eq("escala_id", rodada.escala_id)
      .eq("tipo_regra", "ordem_por_tipo")
      .eq("ativa", true)
      .maybeSingle();

    let ordemTiposAtual: string[] | null = null;
    if (regraOrdem && regraOrdem.configuracao) {
      const config = regraOrdem.configuracao as any;
      if (config.ordem && Array.isArray(config.ordem)) {
        ordemTiposAtual = config.ordem;
        setOrdemTipos(config.ordem);
      }
    }

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
      .eq("escala_id", rodada.escala_id);

    if (atividadesData) {
      // Ordenar atividades
      let atividadesOrdenadas = [...atividadesData];
      
      if (ordemTiposAtual && ordemTiposAtual.length > 0) {
        // Se há regra de ordem por tipo, ordenar por tipo primeiro, depois por data/horário
        atividadesOrdenadas.sort((a, b) => {
          const indexA = ordemTiposAtual.indexOf(a.tipo);
          const indexB = ordemTiposAtual.indexOf(b.tipo);
          
          // Se os tipos são diferentes, ordenar pela ordem configurada
          if (indexA !== indexB) {
            // Se um tipo não está na lista, colocar no final
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          }
          
          // Se são do mesmo tipo, ordenar por data e horário
          const dataCompare = a.data.localeCompare(b.data);
          if (dataCompare !== 0) return dataCompare;
          
          return a.horario_inicio.localeCompare(b.horario_inicio);
        });
      } else {
        // Ordenação padrão: por data e horário
        atividadesOrdenadas.sort((a, b) => {
          const dataCompare = a.data.localeCompare(b.data);
          if (dataCompare !== 0) return dataCompare;
          return a.horario_inicio.localeCompare(b.horario_inicio);
        });
      }
      
      setAtividades(atividadesOrdenadas);
      
      // Buscar TODAS as escolhas da escala (todas as rodadas)
      const { data: escolhasData } = await supabase
        .from("escolhas")
        .select("*, profiles(nome_completo), rodadas!inner(escala_id)")
        .eq("rodadas.escala_id", rodada.escala_id);
      
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
      
      // Verificar novamente se já escolheu nesta rodada (segurança)
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

      // Verificar se já escolheu esta atividade em alguma rodada anterior da mesma escala
      const { data: escolhaAtividadeAnterior } = await supabase
        .from("escolhas")
        .select("id, rodadas!inner(escala_id)")
        .eq("user_id", userId)
        .eq("atividade_id", atividadeSelecionada)
        .eq("rodadas.escala_id", rodadaAtual.escala_id)
        .maybeSingle();

      if (escolhaAtividadeAnterior) {
        toast({
          title: "Atividade já escolhida!",
          description: "Você já escolheu esta atividade em uma rodada anterior.",
          variant: "destructive",
        });
        setLoading(false);
        setAtividadeSelecionada(null);
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
        
        // Verificar se é erro de atividade lotada
        if (escolhaError.message?.includes('lotada')) {
          toast({
            title: "Atividade lotada!",
            description: "Esta atividade já está com todas as vagas preenchidas. Por favor, escolha outra.",
            variant: "destructive",
          });
          setAtividadeSelecionada(null);
          fetchRodadaAtual(); // Atualizar dados
          setLoading(false);
          return;
        }
        
        throw escolhaError;
      }

      console.log('Escolha registrada com sucesso');

      // Verificar se as rodadas estão pausadas antes de avançar
      const { data: escala } = await supabase
        .from("escalas")
        .select("rodadas_pausadas")
        .eq("id", rodadaAtual.escala_id)
        .single();

      if (escala?.rodadas_pausadas) {
        toast({
          title: "Escolha registrada!",
          description: "As rodadas estão pausadas. O administrador precisa continuar as rodadas para avançar.",
        });
        setAtividadeSelecionada(null);
        setJaEscolheu(true);
        setTimeout(() => {
          fetchRodadaAtual();
        }, 500);
        setLoading(false);
        return;
      }

      // Avançar para próximo participante usando função do banco
      const { data: resultado, error: rodadaError } = await supabase.rpc(
        'avancar_rodada',
        { rodada_id_param: rodadaAtual.id }
      );

      if (rodadaError) {
        console.error('Erro ao avançar rodada:', rodadaError);
        throw rodadaError;
      }

      console.log('Rodada atualizada com sucesso:', resultado);

      const resultadoTipado = resultado as unknown as AvancarRodadaResult;

      if (resultadoTipado.rodada_finalizada) {
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
        <CardContent className="py-8 sm:py-12 text-center">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
          <p className="text-sm sm:text-base text-muted-foreground">
            Nenhuma rodada ativa no momento
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg sm:text-xl">Rodada {rodadaAtual.numero}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{rodadaAtual.escalas.nome}</CardDescription>
            </div>
            {minhaVez ? (
              <Badge className="bg-primary self-start sm:self-auto">Sua vez!</Badge>
            ) : (
              <Badge variant="secondary" className="self-start sm:self-auto">Aguardando</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!minhaVez && participanteAtual && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              Vez de: <strong className="text-foreground">{participanteAtual.nome_completo}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {rodadasPausadas && (
        <Card className="bg-yellow-500/10 border-yellow-500/50">
          <CardContent className="py-6 sm:py-8 text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-yellow-600 dark:text-yellow-400 text-2xl sm:text-3xl">⏸️</div>
            <p className="font-semibold text-base sm:text-lg">Rodadas Pausadas</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              O administrador pausou as rodadas. Aguarde a liberação para continuar.
            </p>
          </CardContent>
        </Card>
      )}

      {!rodadasPausadas && jaEscolheu && (
        <Card className="bg-muted">
          <CardContent className="py-6 sm:py-8 text-center">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-primary" />
            <p className="font-semibold text-base sm:text-lg">Você já escolheu uma atividade!</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Aguarde a próxima rodada para fazer uma nova escolha.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="ocultar-escolhidas"
                checked={ocultarEscolhidas}
                onCheckedChange={setOcultarEscolhidas}
              />
              <Label htmlFor="ocultar-escolhidas" className="text-xs sm:text-sm cursor-pointer">
                Ocultar atividades lotadas
              </Label>
            </div>
            
            {minhaVez && !jaEscolheu && !rodadasPausadas && atividadeSelecionada && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setAtividadeSelecionada(null)}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarEscolha}
                  disabled={loading}
                  size="sm"
                  className="bg-primary text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Confirmar
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Label htmlFor="tipo-filtro" className="text-xs sm:text-sm shrink-0">
              Filtrar por tipo:
            </Label>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger id="tipo-filtro" className="w-full sm:w-[200px] h-9">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="Plantão">Plantão</SelectItem>
                <SelectItem value="Ambulatório">Ambulatório</SelectItem>
                <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                <SelectItem value="Bloco">Bloco</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {minhaVez && !jaEscolheu && !rodadasPausadas && (
          <h3 className="font-semibold text-sm sm:text-base">Escolha uma atividade:</h3>
        )}

        {!minhaVez && !jaEscolheu && !rodadasPausadas && (
          <div className="text-xs sm:text-sm text-muted-foreground text-center py-2">
            Visualizando atividades disponíveis
          </div>
        )}

        <div className="space-y-2">
          {atividades
            .filter((atividade) => {
              const filtroTipo = tipoFiltro === "todos" || atividade.tipo === tipoFiltro;
              const filtroVagas = !ocultarEscolhidas || atividade.vagas_ocupadas < atividade.vagas_total;
              return filtroTipo && filtroVagas;
            })
            .map((atividade) => {
            const isSelecionada = atividadeSelecionada === atividade.id;
            const vagasDisponiveis = atividade.vagas_ocupadas < atividade.vagas_total;
            const escolhasDestaAtividade = escolhasPorAtividade[atividade.id] || [];
            const jaEscolhiEstaAtividade = escolhasDestaAtividade.some((e: any) => e.user_id === userId);
            const temEscolhas = escolhasDestaAtividade.length > 0;
            const podeSelecionar = minhaVez && !jaEscolheu && !rodadasPausadas && vagasDisponiveis && !jaEscolhiEstaAtividade;
            
            return (
              <Card 
                key={atividade.id} 
                className={`transition-all ${
                  temEscolhas 
                    ? "bg-muted/50 opacity-75" 
                    : ""
                } ${
                  !vagasDisponiveis 
                    ? "opacity-50 cursor-not-allowed" 
                    : podeSelecionar 
                      ? "cursor-pointer" 
                      : "cursor-default"
                } ${
                  isSelecionada 
                    ? "border-primary border-2 bg-primary/5" 
                    : podeSelecionar && !temEscolhas
                      ? "hover:border-primary/50" 
                      : ""
                }`}
                onClick={() => podeSelecionar && setAtividadeSelecionada(atividade.id)}
              >
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
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
                          {jaEscolhiEstaAtividade && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                              Já escolhida
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs flex-1">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(atividade.data + "T00:00:00"), "dd/MM", { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {atividade.horario_inicio}-{atividade.horario_fim}
                            </div>
                          </div>
                          {atividade.local && (
                            <div className="flex items-center gap-1 font-semibold text-primary">
                              📍 {atividade.local}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-1 text-xs ${
                          vagasDisponiveis ? "text-muted-foreground" : "text-destructive font-semibold"
                        }`}>
                          <Users className="w-3 h-3" />
                          <span className="hidden sm:inline">{atividade.vagas_ocupadas}/{atividade.vagas_total}</span>
                          <span className="sm:hidden">{atividade.vagas_ocupadas}/{atividade.vagas_total}</span>
                        </div>
                        {isSelecionada && (
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        )}
                      </div>
                    </div>
                    
                    {escolhasDestaAtividade.length > 0 && (
                      <div className="flex items-start gap-2 text-xs pt-2 border-t mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="font-semibold text-foreground">
                            Escolhida por:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {escolhasDestaAtividade.map((e: any, idx: number) => (
                              <Badge 
                                key={idx}
                                variant={e.user_id === userId ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {e.profiles?.nome_completo || "Participante"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {atividades
          .filter((a) => {
            const filtroTipo = tipoFiltro === "todos" || a.tipo === tipoFiltro;
            const filtroVagas = !ocultarEscolhidas || a.vagas_ocupadas < a.vagas_total;
            return filtroTipo && filtroVagas;
          }).length === 0 && (
          <Card>
            <CardContent className="py-6 sm:py-8 text-center text-muted-foreground">
              {atividades.length === 0 
                ? "Nenhuma atividade cadastrada para esta escala"
                : tipoFiltro !== "todos"
                ? `Nenhuma atividade do tipo "${tipoFiltro}" disponível`
                : "Todas as atividades já estão com vagas completas"
              }
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
