import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Users } from "lucide-react";

export const RoundManager = () => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [escalaId, setEscalaId] = useState("");
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [rodadaAtual, setRodadaAtual] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
    fetchParticipantes();
  }, []);

  useEffect(() => {
    if (escalaId) {
      fetchRodadaAtual();
    }
  }, [escalaId]);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .eq("status", "ativa")
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const fetchParticipantes = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome_completo")
      .order("nome_completo");
    
    if (data) setParticipantes(data);
  };

  const fetchRodadaAtual = async () => {
    const { data } = await supabase
      .from("rodadas")
      .select("*")
      .eq("escala_id", escalaId)
      .eq("finalizada", false)
      .order("numero", { ascending: false })
      .limit(1)
      .single();
    
    setRodadaAtual(data);
  };

  const sortearOrdem = () => {
    const shuffled = [...participantes].sort(() => Math.random() - 0.5);
    return shuffled.map(p => p.id);
  };

  const iniciarNovaRodada = async () => {
    if (!escalaId) return;
    setLoading(true);

    try {
      // Verificar qual o número da próxima rodada
      const { data: ultimaRodada } = await supabase
        .from("rodadas")
        .select("numero")
        .eq("escala_id", escalaId)
        .order("numero", { ascending: false })
        .limit(1)
        .single();

      const proximoNumero = ultimaRodada ? ultimaRodada.numero + 1 : 1;
      const ordemSorteada = sortearOrdem();

      const { error } = await supabase.from("rodadas").insert({
        escala_id: escalaId,
        numero: proximoNumero,
        ordem_sorteada: ordemSorteada,
        indice_atual: 0,
        finalizada: false
      });

      if (error) throw error;

      toast({
        title: "Rodada iniciada!",
        description: `Rodada ${proximoNumero} foi criada e a ordem sorteada.`,
      });

      fetchRodadaAtual();
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar rodada",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const finalizarRodada = async () => {
    if (!rodadaAtual) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("rodadas")
        .update({ finalizada: true })
        .eq("id", rodadaAtual.id);

      if (error) throw error;

      toast({
        title: "Rodada finalizada!",
        description: "A rodada foi encerrada com sucesso.",
      });

      setRodadaAtual(null);
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar rodada",
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
          <RefreshCw className="w-5 h-5" />
          Gerenciar Rodadas
        </CardTitle>
        <CardDescription>
          Inicie rodadas e sorteie a ordem de escolha dos participantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Escala</label>
          <Select value={escalaId} onValueChange={setEscalaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a escala" />
            </SelectTrigger>
            <SelectContent>
              {escalas.map((escala) => (
                <SelectItem key={escala.id} value={escala.id}>
                  {escala.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rodadaAtual ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Rodada Atual</div>
                <div className="text-2xl font-bold">Rodada {rodadaAtual.numero}</div>
              </div>
              <Badge variant="secondary">Em andamento</Badge>
            </div>

            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Ordem Sorteada
              </div>
              <div className="space-y-2">
                {rodadaAtual.ordem_sorteada.map((userId: string, index: number) => {
                  const participante = participantes.find(p => p.id === userId);
                  const isAtual = index === rodadaAtual.indice_atual;
                  return (
                    <div
                      key={userId}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isAtual ? "bg-primary/10 border border-primary" : "bg-muted"
                      }`}
                    >
                      <div className="font-bold text-lg w-8">{index + 1}º</div>
                      <div className="flex-1">{participante?.nome_completo}</div>
                      {isAtual && <Badge>Vez atual</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button onClick={finalizarRodada} disabled={loading} variant="destructive" className="w-full">
              Finalizar Rodada
            </Button>
          </div>
        ) : (
          <Button onClick={iniciarNovaRodada} disabled={loading || !escalaId} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Iniciar Nova Rodada
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
