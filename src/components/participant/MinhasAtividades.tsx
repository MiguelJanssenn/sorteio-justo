import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export const MinhasAtividades = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMinhasAtividades();

    // Realtime para mudanças nas escolhas
    const channel = supabase
      .channel('minhas-atividades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escolhas'
        },
        () => {
          fetchMinhasAtividades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMinhasAtividades = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Buscar escala ativa
      const { data: escalaAtiva } = await supabase
        .from("escalas")
        .select("id")
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!escalaAtiva) {
        setCount(0);
        setLoading(false);
        return;
      }

      // Contar minhas escolhas nesta escala (todas as rodadas)
      const { data: escolhas, error } = await supabase
        .from("escolhas")
        .select("id, rodadas!inner(escala_id)")
        .eq("user_id", session.user.id)
        .eq("rodadas.escala_id", escalaAtiva.id);

      if (error) {
        console.error("Erro ao buscar escolhas:", error);
        setCount(0);
      } else {
        setCount(escolhas?.length || 0);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar atividades:", error);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Minhas Atividades</CardTitle>
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-12"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{count}</div>
            <p className="text-xs text-muted-foreground">atividades selecionadas</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
