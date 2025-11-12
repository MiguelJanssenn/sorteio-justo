import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const VezAtual = () => {
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<string>("");
  const [position, setPosition] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCurrentTurn();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(checkCurrentTurn, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const checkCurrentTurn = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Buscar rodada ativa
      const { data: rodadas } = await supabase
        .from("rodadas")
        .select("*, escalas!inner(nome)")
        .eq("finalizada", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!rodadas || rodadas.length === 0) {
        setLoading(false);
        return;
      }

      const rodada = rodadas[0];
      const ordemSorteada = rodada.ordem_sorteada;
      const indiceAtual = rodada.indice_atual;

      // Verificar quem é o jogador atual
      const currentUserId = ordemSorteada[indiceAtual];
      setIsMyTurn(currentUserId === session.user.id);
      setTotalPlayers(ordemSorteada.length);
      setPosition(ordemSorteada.indexOf(session.user.id) + 1);
      setRoundNumber(rodada.numero);

      // Buscar nome do jogador atual
      if (currentUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nome_completo")
          .eq("id", currentUserId)
          .single();

        if (profile) {
          setCurrentPlayer(profile.nome_completo);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao verificar vez:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!currentPlayer) {
    return (
      <Alert className="mb-6">
        <Clock className="h-4 w-4" />
        <AlertTitle>Aguardando rodada</AlertTitle>
        <AlertDescription>
          Não há rodadas ativas no momento. Aguarde o administrador iniciar uma nova rodada.
        </AlertDescription>
      </Alert>
    );
  }

  if (isMyTurn) {
    return (
      <Alert className="mb-6 bg-primary/10 border-primary animate-pulse">
        <Bell className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary text-lg font-bold">É sua vez!</AlertTitle>
        <AlertDescription className="text-primary">
          É hora de escolher sua atividade. Você é o jogador número {position} de {totalPlayers} na Rodada {roundNumber}.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-6 border-muted">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Vez atual</p>
              <p className="text-lg font-bold text-foreground">{currentPlayer}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Sua posição</p>
            <Badge variant="secondary" className="text-base">
              {position} / {totalPlayers}
            </Badge>
          </div>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          Rodada {roundNumber} em andamento
        </div>
      </CardContent>
    </Card>
  );
};
