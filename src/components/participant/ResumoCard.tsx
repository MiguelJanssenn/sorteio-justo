import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

export const ResumoCard = () => {
  const [escala, setEscala] = useState<any>(null);
  const [atividadesCount, setAtividadesCount] = useState(0);
  const [rodadaNumero, setRodadaNumero] = useState<number | null>(null);
  const [rodadaStatus, setRodadaStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Realtime para mudanças
    const escalasChannel = supabase
      .channel('resumo-escalas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalas' }, fetchData)
      .subscribe();

    const escolhasChannel = supabase
      .channel('resumo-escolhas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escolhas' }, fetchData)
      .subscribe();

    const rodadasChannel = supabase
      .channel('resumo-rodadas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rodadas' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(escalasChannel);
      supabase.removeChannel(escolhasChannel);
      supabase.removeChannel(rodadasChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Buscar escala ativa
      const { data: escalaAtiva } = await supabase
        .from("escalas")
        .select("*")
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setEscala(escalaAtiva);

      if (escalaAtiva) {
        // Contar atividades do usuário
        const { data: escolhas } = await supabase
          .from("escolhas")
          .select("id, rodadas!inner(escala_id)")
          .eq("user_id", session.user.id)
          .eq("rodadas.escala_id", escalaAtiva.id);

        setAtividadesCount(escolhas?.length || 0);

        // Buscar rodada ativa
        const { data: rodada } = await supabase
          .from("rodadas")
          .select("numero, finalizada")
          .eq("finalizada", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rodada) {
          setRodadaNumero(rodada.numero);
          setRodadaStatus("Em andamento");
        } else {
          setRodadaNumero(null);
          setRodadaStatus("Aguardando início");
        }
      } else {
        setAtividadesCount(0);
        setRodadaNumero(null);
        setRodadaStatus("Aguardando início");
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-8 bg-muted rounded w-32"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Resumo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Escala Ativa */}
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Escala Ativa</p>
            {escala ? (
              <>
                <p className="text-lg sm:text-xl font-bold truncate">{escala.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(escala.periodo_inicio), "dd/MM", { locale: ptBR })} - {format(new Date(escala.periodo_fim), "dd/MM", { locale: ptBR })}
                </p>
              </>
            ) : (
              <p className="text-lg sm:text-xl font-bold">-</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Minhas Atividades */}
        <div className="flex items-start gap-3">
          <ClipboardList className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Minhas Atividades</p>
            <p className="text-lg sm:text-xl font-bold">{atividadesCount}</p>
            <p className="text-xs text-muted-foreground">atividades selecionadas</p>
          </div>
        </div>

        <Separator />

        {/* Rodada Atual */}
        <div className="flex items-start gap-3">
          <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Rodada Atual</p>
            <p className="text-lg sm:text-xl font-bold">
              {rodadaNumero !== null ? rodadaNumero : "-"}
            </p>
            <p className="text-xs text-muted-foreground">{rodadaStatus}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
