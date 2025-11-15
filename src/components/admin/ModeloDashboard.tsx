import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModeloDashboardProps {
  escalaId: string;
  modeloId: string;
}

export function ModeloDashboard({ escalaId, modeloId }: ModeloDashboardProps) {
  const [modelo, setModelo] = useState<any>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [escolhas, setEscolhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [escalaId, modeloId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar modelo
      const { data: modeloData } = await supabase
        .from("modelos_estagio")
        .select("*")
        .eq("id", modeloId)
        .single();

      // Buscar atividades da escala
      const { data: atividadesData } = await supabase
        .from("atividades")
        .select("*")
        .eq("escala_id", escalaId)
        .order("data")
        .order("horario_inicio");

      // Buscar escolhas
      const atividadeIds = atividadesData?.map((a: any) => a.id) || [];
      const { data: escolhasData } = await supabase
        .from("escolhas")
        .select(`
          *,
          profiles(nome_completo),
          atividades(*)
        `)
        .in("atividade_id", atividadeIds);

      setModelo(modeloData);
      setAtividades(atividadesData || []);
      setEscolhas(escolhasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar atividades por data
  const atividadesPorData = atividades.reduce((acc, atividade) => {
    const data = atividade.data;
    if (!acc[data]) acc[data] = [];
    acc[data].push(atividade);
    return acc;
  }, {} as Record<string, any[]>);

  // Obter participantes para cada atividade
  const getParticipantes = (atividadeId: string) => {
    return escolhas
      .filter(e => e.atividade_id === atividadeId)
      .map(e => e.profiles?.nome_completo)
      .filter(Boolean);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!modelo) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">Modelo não encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard - {modelo.nome}</CardTitle>
        <CardDescription>
          Visualização das atividades e escolhas dos participantes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(atividadesPorData).map(([data, atividadesDia]) => {
            const atividades = atividadesDia as any[];
            return (
              <div key={data} className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {format(new Date(data + "T00:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Horário</TableHead>
                    {modelo.tem_rotacao && <TableHead>Especialidade</TableHead>}
                    <TableHead>Vagas</TableHead>
                    <TableHead>Participantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atividades.map((atividade) => {
                    const participantes = getParticipantes(atividade.id);
                    return (
                      <TableRow key={atividade.id}>
                        <TableCell className="font-medium">{atividade.tipo}</TableCell>
                        <TableCell>
                          {atividade.horario_inicio} - {atividade.horario_fim}
                        </TableCell>
                        {modelo.tem_rotacao && (
                          <TableCell>{atividade.especialidade || "-"}</TableCell>
                        )}
                        <TableCell>
                          {atividade.vagas_ocupadas || 0}/{atividade.vagas_total}
                        </TableCell>
                        <TableCell>
                          {participantes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {participantes.map((nome, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-primary/10 text-primary"
                                >
                                  {nome}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            );
          })}

          {Object.keys(atividadesPorData).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma atividade cadastrada ainda</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
