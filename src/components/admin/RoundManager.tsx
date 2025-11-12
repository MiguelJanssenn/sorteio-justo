import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Users, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const RoundManager = () => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [escalaId, setEscalaId] = useState("");
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [rodadaAtual, setRodadaAtual] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deletingRodada, setDeletingRodada] = useState(false);
  const [deletingAllRodadas, setDeletingAllRodadas] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
    fetchParticipantes();
  }, []);

  useEffect(() => {
    if (escalaId) {
      fetchRodadaAtual();
      fetchParticipantes();
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
    if (!escalaId) return;

    // Buscar participantes ativos nesta escala
    const { data: participantesAtivos } = await supabase
      .from("participacao_escalas" as any)
      .select("user_id")
      .eq("escala_id", escalaId)
      .eq("ativo", true);

    if (!participantesAtivos || participantesAtivos.length === 0) {
      setParticipantes([]);
      return;
    }

    const participanteIds = participantesAtivos.map((p: any) => p.user_id);

    // Buscar roles de todos os usuários
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", participanteIds);

    if (!allRoles || allRoles.length === 0) {
      setParticipantes([]);
      return;
    }

    // Filtrar apenas quem tem role 'participante' E NÃO tem role 'admin'
    const adminIds = allRoles.filter(r => r.role === "admin").map(r => r.user_id);
    const participanteValidoIds = participanteIds.filter(
      id => !adminIds.includes(id) && allRoles.some(r => r.user_id === id && r.role === "participante")
    );

    if (participanteValidoIds.length === 0) {
      setParticipantes([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, nome_completo")
      .in("id", participanteValidoIds)
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

    if (participantes.length === 0) {
      toast({
        title: "Nenhum participante ativo",
        description: "Não há participantes ativos para esta escala. Peça aos usuários para marcarem participação.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verificar qual o número da próxima rodada
      const { data: ultimaRodada } = await supabase
        .from("rodadas")
        .select("numero")
        .eq("escala_id", escalaId)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();

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
        description: "A próxima rodada será criada automaticamente com novo sorteio.",
      });

      // A próxima rodada será criada automaticamente pelo trigger
      setTimeout(() => {
        fetchRodadaAtual();
      }, 1000);
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

  const excluirRodada = async () => {
    if (!rodadaAtual) return;
    setLoading(true);

    try {
      // Verificar se há escolhas nesta rodada
      const { data: escolhas } = await supabase
        .from("escolhas")
        .select("id")
        .eq("rodada_id", rodadaAtual.id)
        .limit(1);

      if (escolhas && escolhas.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta rodada já possui escolhas registradas.",
          variant: "destructive",
        });
        setLoading(false);
        setDeletingRodada(false);
        return;
      }

      const { error } = await supabase
        .from("rodadas")
        .delete()
        .eq("id", rodadaAtual.id);

      if (error) throw error;

      toast({
        title: "Rodada excluída!",
        description: "A rodada foi removida com sucesso.",
      });

      setDeletingRodada(false);
      setRodadaAtual(null);
      fetchRodadaAtual();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir rodada",
        description: error.message,
        variant: "destructive",
      });
      setDeletingRodada(false);
    } finally {
      setLoading(false);
    }
  };

  const excluirTodasRodadas = async () => {
    if (!escalaId) return;
    setLoading(true);

    try {
      // Usar a função do banco de dados que lida com a exclusão de forma segura
      const { data, error } = await supabase.rpc('excluir_rodadas_escala', {
        escala_id_param: escalaId
      });

      if (error) throw error;

      const resultado = data as { rodadas_excluidas: number; escolhas_excluidas: number };

      if (resultado.rodadas_excluidas === 0) {
        toast({
          title: "Nenhuma rodada encontrada",
          description: "Não há rodadas para excluir nesta escala.",
        });
      } else {
        toast({
          title: "Rodadas excluídas!",
          description: `${resultado.rodadas_excluidas} rodada(s) e ${resultado.escolhas_excluidas} escolha(s) foram removidas com sucesso.`,
        });
      }

      setDeletingAllRodadas(false);
      setRodadaAtual(null);
      fetchRodadaAtual();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir rodadas",
        description: error.message,
        variant: "destructive",
      });
      setDeletingAllRodadas(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Gerenciar Rodadas
          </CardTitle>
          <CardDescription>
            As rodadas são criadas automaticamente com novo sorteio ao finalizar cada uma
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

        {escalaId && (
          <Button 
            onClick={() => setDeletingAllRodadas(true)} 
            disabled={loading} 
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Todas as Rodadas desta Escala
          </Button>
        )}

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

              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                ℹ️ Quando todos os participantes escolherem, clique em "Finalizar Rodada" e a próxima será criada automaticamente com novo sorteio.
              </div>

              <div className="flex gap-2">
                <Button onClick={finalizarRodada} disabled={loading} variant="destructive" className="flex-1">
                  Finalizar Rodada e Sortear Próxima
                </Button>
                <Button onClick={() => setDeletingRodada(true)} disabled={loading} variant="outline" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={iniciarNovaRodada} disabled={loading || !escalaId} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Iniciar Nova Rodada
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deletingRodada} onOpenChange={setDeletingRodada}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rodada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a rodada {rodadaAtual?.numero}? Esta ação não pode ser desfeita.
              {"\n\n"}
              Nota: Só é possível excluir rodadas sem escolhas registradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={excluirRodada}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingAllRodadas} onOpenChange={setDeletingAllRodadas}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Todas as Rodadas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir TODAS as rodadas desta escala? Esta ação não pode ser desfeita.
              {"\n\n"}
              Todas as escolhas registradas nessas rodadas também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={excluirTodasRodadas}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
