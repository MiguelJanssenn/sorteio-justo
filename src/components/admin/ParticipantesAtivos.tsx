import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Participante {
  user_id: string;
  nome_completo: string;
  ativo: boolean;
}

export const ParticipantesAtivos = () => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [escalaId, setEscalaId] = useState("");
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
  }, []);

  useEffect(() => {
    if (escalaId) {
      fetchParticipantes();
    }
  }, [escalaId]);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const fetchParticipantes = async () => {
    if (!escalaId) return;
    setLoading(true);

    try {
      // Buscar todas as participações para esta escala
      const { data: participacoes } = await supabase
        .from("participacao_escalas" as any)
        .select("user_id, ativo")
        .eq("escala_id", escalaId);

      if (!participacoes || participacoes.length === 0) {
        setParticipantes([]);
        setLoading(false);
        return;
      }

      const userIds = participacoes.map((p: any) => p.user_id);

      // Buscar perfis dos participantes
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", userIds);

      if (!profiles) {
        setParticipantes([]);
        setLoading(false);
        return;
      }

      // Combinar dados
      const participantesCompletos = participacoes.map((p: any) => {
        const profile = profiles.find((prof) => prof.id === p.user_id);
        return {
          user_id: p.user_id,
          nome_completo: profile?.nome_completo || "Usuário não encontrado",
          ativo: p.ativo,
        };
      });

      // Ordenar por nome
      participantesCompletos.sort((a, b) => 
        a.nome_completo.localeCompare(b.nome_completo)
      );

      setParticipantes(participantesCompletos);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar participantes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const participantesAtivos = participantes.filter(p => p.ativo);
  const participantesInativos = participantes.filter(p => !p.ativo);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Participantes por Escala
        </CardTitle>
        <CardDescription>
          Visualize todos os participantes e seu status de participação em cada escala
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Selecione a Escala</label>
          <Select value={escalaId} onValueChange={setEscalaId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma escala" />
            </SelectTrigger>
            <SelectContent>
              {escalas.map((escala) => (
                <SelectItem key={escala.id} value={escala.id}>
                  {escala.nome} ({escala.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {escalaId && !loading && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Participantes Ativos</p>
                      <p className="text-3xl font-bold text-primary">{participantesAtivos.length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Participantes Inativos</p>
                      <p className="text-3xl font-bold text-muted-foreground">{participantesInativos.length}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {participantes.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Nome Completo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participantes.map((participante) => (
                      <TableRow key={participante.user_id}>
                        <TableCell className="font-medium">
                          {participante.nome_completo}
                        </TableCell>
                        <TableCell className="text-center">
                          {participante.ativo ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                Nenhum participante registrado nesta escala
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="text-center p-8 text-muted-foreground">
            Carregando participantes...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
