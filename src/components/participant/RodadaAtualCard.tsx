import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

export const RodadaAtualCard = () => {
  const [rodadaNumero, setRodadaNumero] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRodadaAtual();

    // Realtime para mudanças na rodada
    const channel = supabase
      .channel('rodada-atual-card-changes')
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
  }, []);

  const fetchRodadaAtual = async () => {
    try {
      // Buscar rodada ativa
      const { data: rodada } = await supabase
        .from("rodadas")
        .select("numero")
        .eq("finalizada", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rodada) {
        setRodadaNumero(rodada.numero);
      } else {
        setRodadaNumero(null);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar rodada:", error);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Rodada Atual</CardTitle>
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-12"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {rodadaNumero !== null ? rodadaNumero : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {rodadaNumero !== null ? "Em andamento" : "Aguardando início"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
