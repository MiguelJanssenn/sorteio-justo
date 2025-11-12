import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const EscalaAtivaCard = () => {
  const [escala, setEscala] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEscalaAtiva();

    // Realtime para mudanças na escala
    const channel = supabase
      .channel('escala-ativa-card-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escalas'
        },
        () => {
          fetchEscalaAtiva();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEscalaAtiva = async () => {
    try {
      const { data } = await supabase
        .from("escalas")
        .select("*")
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setEscala(data);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar escala:", error);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Escala Ativa</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-1"></div>
            <div className="h-4 bg-muted rounded w-24"></div>
          </div>
        ) : escala ? (
          <>
            <div className="text-2xl font-bold">{escala.nome}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(escala.periodo_inicio), "dd/MM", { locale: ptBR })} - {format(new Date(escala.periodo_fim), "dd/MM", { locale: ptBR })}
            </p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Nenhuma escala ativa</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
