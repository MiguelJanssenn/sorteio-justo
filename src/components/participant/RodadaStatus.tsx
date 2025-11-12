import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Clock } from "lucide-react";

export const RodadaStatus = () => {
  const [rodadaAtual, setRodadaAtual] = useState<any>(null);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    getCurrentUser();
    fetchRodadaAtual();

    // Realtime para mudanças na rodada
    const channel = supabase
      .channel('rodadas-status-changes')
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escolhas'
        },
        () => {
          fetchRodadaAtual();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
    }
  };

  const fetchRodadaAtual = async () => {
    try {
      // Buscar rodada ativa
      const { data: rodada } = await supabase
        .from("rodadas")
        .select("*, escalas(nome)")
        .eq("finalizada", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!rodada) {
        setRodadaAtual(null);
        setLoading(false);
        return;
      }

      setRodadaAtual(rodada);

      // Buscar informações dos participantes
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", rodada.ordem_sorteada);

      // Buscar escolhas já feitas nesta rodada
      const { data: escolhas } = await supabase
        .from("escolhas")
        .select("user_id, atividade_id, atividades(tipo, data)")
        .eq("rodada_id", rodada.id);

      // Montar array de participantes com suas informações
      const participantesOrdenados = rodada.ordem_sorteada.map((id: string, index: number) => {
        const profile = profiles?.find(p => p.id === id);
        const escolha = escolhas?.find(e => e.user_id === id);
        const isAtual = index === rodada.indice_atual;
        const jaEscolheu = !!escolha;

        return {
          id,
          posicao: index + 1,
          nome: profile?.nome_completo || "Desconhecido",
          isAtual,
          jaEscolheu,
          escolha: escolha ? {
            tipo: escolha.atividades?.tipo,
            data: escolha.atividades?.data
          } : null
        };
      });

      setParticipantes(participantesOrdenados);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar rodada:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!rodadaAtual) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma rodada ativa no momento</p>
          <p className="text-sm text-muted-foreground mt-1">
            Aguarde o administrador iniciar uma nova rodada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Rodada {rodadaAtual.numero}
          </CardTitle>
          <Badge variant="secondary">
            {rodadaAtual.escalas?.nome}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{participantes.length} participantes</span>
          </div>

          <div className="space-y-2">
            {participantes.map((participante) => (
              <div
                key={participante.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  participante.isAtual
                    ? "border-primary bg-primary/10 shadow-sm"
                    : participante.jaEscolheu
                    ? "border-muted bg-muted/30"
                    : "border-border"
                } ${participante.id === userId ? "ring-2 ring-primary/20" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                      participante.isAtual
                        ? "bg-primary text-primary-foreground"
                        : participante.jaEscolheu
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {participante.posicao}
                  </div>
                  <div>
                    <p className={`font-medium ${participante.isAtual ? "text-primary" : ""}`}>
                      {participante.nome}
                      {participante.id === userId && (
                        <span className="text-xs ml-2 text-primary">(Você)</span>
                      )}
                    </p>
                    {participante.escolha && (
                      <p className="text-xs text-muted-foreground">
                        Escolheu: {participante.escolha.tipo}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  {participante.isAtual && !participante.jaEscolheu && (
                    <Badge className="animate-pulse">Escolhendo...</Badge>
                  )}
                  {participante.jaEscolheu && (
                    <Badge variant="secondary">✓ Escolheu</Badge>
                  )}
                  {!participante.isAtual && !participante.jaEscolheu && (
                    <Badge variant="outline">Aguardando</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
