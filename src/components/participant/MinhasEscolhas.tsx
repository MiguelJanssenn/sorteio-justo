import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Escolha {
  id: string;
  created_at: string;
  atividade_id: string;
  rodada_id: string;
  atividades: {
    tipo: string;
    data: string;
    horario_inicio: string;
    horario_fim: string;
    local: string | null;
    observacao: string | null;
  };
  rodadas: {
    numero: number;
  };
}

export const MinhasEscolhas = () => {
  const [escolhas, setEscolhas] = useState<Escolha[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEscolhas();

    // Realtime para mudanças nas escolhas
    const channel = supabase
      .channel('minhas-escolhas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escolhas'
        },
        () => {
          fetchEscolhas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEscolhas = async () => {
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
        setEscolhas([]);
        setLoading(false);
        return;
      }

      // Buscar minhas escolhas nesta escala
      const { data, error } = await supabase
        .from("escolhas")
        .select(`
          id,
          created_at,
          atividade_id,
          rodada_id,
          atividades (
            tipo,
            data,
            horario_inicio,
            horario_fim,
            local,
            observacao
          ),
          rodadas!inner (
            numero,
            escala_id
          )
        `)
        .eq("user_id", session.user.id)
        .eq("rodadas.escala_id", escalaAtiva.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar escolhas:", error);
        setEscolhas([]);
      } else {
        setEscolhas(data as any || []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar escolhas:", error);
      setLoading(false);
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case "plantão":
        return "destructive";
      case "ambulatório":
        return "default";
      case "enfermaria":
        return "secondary";
      case "bloco":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Minhas Escolhas</CardTitle>
          <CardDescription>
            Visualize todas as atividades que você selecionou
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (escolhas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Minhas Escolhas</CardTitle>
          <CardDescription>
            Visualize todas as atividades que você selecionou
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Você ainda não fez nenhuma escolha
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas Escolhas</CardTitle>
        <CardDescription>
          Você selecionou {escolhas.length} {escolhas.length === 1 ? 'atividade' : 'atividades'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rodada</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Local</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {escolhas.map((escolha) => (
              <TableRow key={escolha.id}>
                <TableCell>
                  <Badge variant="outline">
                    Rodada {escolha.rodadas.numero}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getTipoBadgeVariant(escolha.atividades.tipo)}>
                    {escolha.atividades.tipo}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(escolha.atividades.data), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-sm">
                  {escolha.atividades.horario_inicio} - {escolha.atividades.horario_fim}
                </TableCell>
                <TableCell className="text-sm">
                  {escolha.atividades.local || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
