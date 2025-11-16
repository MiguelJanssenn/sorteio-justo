import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Loader2, Sparkles } from "lucide-react";
import { format, addDays, isWeekend as checkIsWeekend, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const GeradorAtividades = () => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [escalaId, setEscalaId] = useState("");
  const [escala, setEscala] = useState<any>(null);
  const [tiposAtividade, setTiposAtividade] = useState<any[]>([]);
  const [periodosRotacao, setPeriodosRotacao] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
  }, []);

  useEffect(() => {
    if (escalaId) {
      fetchEscalaDetalhes();
    }
  }, [escalaId]);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*, modelos_estagio(*)")
      .eq("status", "ativa")
      .not("modelo_id", "is", null)
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const fetchEscalaDetalhes = async () => {
    const { data: escalaData } = await supabase
      .from("escalas")
      .select("*, modelos_estagio(*)")
      .eq("id", escalaId)
      .single();

    if (escalaData) {
      setEscala(escalaData);

      // Buscar tipos de atividade do modelo
      if (escalaData.modelo_id) {
        const { data: tipos } = await supabase
          .from("tipos_atividade_modelo")
          .select("*")
          .eq("modelo_id", escalaData.modelo_id)
          .order("ordem_exibicao");

        if (tipos) setTiposAtividade(tipos);

        // Buscar períodos de rotação
        const { data: periodos } = await supabase
          .from("periodos_rotacao")
          .select("*")
          .eq("escala_id", escalaId)
          .order("numero_periodo");

        if (periodos) setPeriodosRotacao(periodos);
      }
    }
  };

  const gerarAtividades = async () => {
    if (!escala || !escalaId) {
      toast({
        title: "Erro",
        description: "Selecione uma escala primeiro",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const atividadesParaInserir: any[] = [];
      const dataInicio = parseISO(escala.periodo_inicio);
      const dataFim = parseISO(escala.periodo_fim);

      // Para cada tipo de atividade
      for (const tipo of tiposAtividade) {
        let dataAtual = dataInicio;

        // Gerar atividades para cada dia do período
        while (dataAtual <= dataFim) {
          const ehFimSemana = checkIsWeekend(dataAtual);
          const ehFeriado = false; // TODO: implementar verificação de feriados

          // Verificar se o tipo permite fim de semana/feriado
          if ((ehFimSemana && !tipo.permite_fim_semana) || (ehFeriado && !tipo.permite_feriado)) {
            dataAtual = addDays(dataAtual, 1);
            continue;
          }

          // Determinar período de rotação atual
          const dataAtualStr = format(dataAtual, "yyyy-MM-dd");
          const periodoAtual = periodosRotacao.find(p => 
            dataAtualStr >= p.data_inicio && dataAtualStr <= p.data_fim
          );

          // Se o modelo tem rotação e não encontrou período, pular
          if (escala.modelos_estagio?.tem_rotacao && !periodoAtual) {
            dataAtual = addDays(dataAtual, 1);
            continue;
          }

          // Criar atividade
          const atividade = {
            escala_id: escalaId,
            tipo: tipo.codigo,
            tipo_atividade_id: tipo.id,
            data: format(dataAtual, "yyyy-MM-dd"),
            horario_inicio: tipo.horario_inicio || "08:00",
            horario_fim: tipo.horario_fim || "18:00",
            vagas_total: tipo.vagas_por_slot,
            vagas_ocupadas: 0,
            eh_fim_semana: ehFimSemana,
            periodo_numero: periodoAtual?.numero_periodo || null,
            observacao: tipo.descricao || null,
          };

          atividadesParaInserir.push(atividade);
          dataAtual = addDays(dataAtual, 1);
        }
      }

      // Inserir todas as atividades
      if (atividadesParaInserir.length > 0) {
        const { error } = await supabase
          .from("atividades")
          .insert(atividadesParaInserir);

        if (error) throw error;

        toast({
          title: "Atividades geradas!",
          description: `${atividadesParaInserir.length} atividades foram criadas com sucesso.`,
        });
      } else {
        toast({
          title: "Nenhuma atividade gerada",
          description: "Verifique as configurações do modelo e períodos de rotação.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao gerar atividades:", error);
      toast({
        title: "Erro ao gerar atividades",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Gerador de Atividades por Modelo
        </CardTitle>
        <CardDescription>
          Gera automaticamente todas as atividades baseadas no modelo e tipos de atividade configurados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="escala">Escala com Modelo</Label>
          <Select value={escalaId} onValueChange={setEscalaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma escala" />
            </SelectTrigger>
            <SelectContent>
              {escalas.map((esc) => (
                <SelectItem key={esc.id} value={esc.id}>
                  {esc.nome} - {esc.modelos_estagio?.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {escala && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Modelo:</span>
                <p className="text-muted-foreground">{escala.modelos_estagio?.nome}</p>
              </div>
              <div>
                <span className="font-semibold">Período:</span>
                <p className="text-muted-foreground">
                  {format(parseISO(escala.periodo_inicio), "dd/MM/yyyy", { locale: ptBR })} até{" "}
                  {format(parseISO(escala.periodo_fim), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <span className="font-semibold">Tipos de Atividade:</span>
                <p className="text-muted-foreground">{tiposAtividade.length} configurados</p>
              </div>
              <div>
                <span className="font-semibold">Períodos de Rotação:</span>
                <p className="text-muted-foreground">
                  {escala.modelos_estagio?.tem_rotacao ? `${periodosRotacao.length} períodos` : "Sem rotação"}
                </p>
              </div>
            </div>

            {tiposAtividade.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">Tipos que serão gerados:</p>
                <div className="flex flex-wrap gap-2">
                  {tiposAtividade.map((tipo) => (
                    <span 
                      key={tipo.id}
                      className="px-2 py-1 bg-background rounded text-xs"
                      style={{ borderLeft: `3px solid ${tipo.cor_dashboard || '#666'}` }}
                    >
                      {tipo.nome} ({tipo.vagas_por_slot} vagas)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={gerarAtividades}
          disabled={loading || !escalaId || tiposAtividade.length === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Gerar Todas as Atividades
            </>
          )}
        </Button>

        {tiposAtividade.length === 0 && escalaId && (
          <p className="text-sm text-destructive text-center">
            Configure os tipos de atividade do modelo antes de gerar
          </p>
        )}
      </CardContent>
    </Card>
  );
};
