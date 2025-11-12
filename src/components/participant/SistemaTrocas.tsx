import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ArrowRightLeft, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MinhaEscolha {
  id: string;
  atividade_id: string;
  atividades: {
    id: string;
    tipo: string;
    data: string;
    horario_inicio: string;
    horario_fim: string;
    local: string | null;
  };
}

interface Troca {
  id: string;
  status: string;
  created_at: string;
  solicitante_id: string;
  receptor_id: string;
  atividade_origem_id: string;
  atividade_destino_id: string;
  solicitante: {
    nome_completo: string;
  };
  receptor: {
    nome_completo: string;
  };
  atividade_origem: {
    tipo: string;
    data: string;
    horario_inicio: string;
    horario_fim: string;
  };
  atividade_destino: {
    tipo: string;
    data: string;
    horario_inicio: string;
    horario_fim: string;
  };
}

const TrocaRow = ({ troca, onResponder, getStatusBadge }: {
  troca: Troca;
  onResponder: (trocaId: string, aceitar: boolean) => void;
  getStatusBadge: (status: string) => JSX.Element;
}) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    fetchUser();
  }, []);

  const souReceptor = userId && troca.receptor_id === userId;

  return (
    <TableRow>
      <TableCell>{troca.solicitante.nome_completo}</TableCell>
      <TableCell>
        <div className="text-sm">
          <Badge variant="outline" className="mb-1">{troca.atividade_origem.tipo}</Badge>
          <div>{format(new Date(troca.atividade_origem.data), "dd/MM/yyyy", { locale: ptBR })}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <Badge variant="outline" className="mb-1">{troca.atividade_destino.tipo}</Badge>
          <div>{format(new Date(troca.atividade_destino.data), "dd/MM/yyyy", { locale: ptBR })}</div>
        </div>
      </TableCell>
      <TableCell>{getStatusBadge(troca.status)}</TableCell>
      <TableCell>
        {souReceptor && troca.status === "pendente" && (
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={() => onResponder(troca.id, true)}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onResponder(troca.id, false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

export const SistemaTrocas = () => {
  const [minhasEscolhas, setMinhasEscolhas] = useState<MinhaEscolha[]>([]);
  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [atividadeOrigem, setAtividadeOrigem] = useState("");
  const [atividadeDestino, setAtividadeDestino] = useState("");
  const [receptorId, setReceptorId] = useState("");
  const [participantesComAtividade, setParticipantesComAtividade] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('trocas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trocas'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Buscar minhas escolhas
      const { data: escolhasData } = await supabase
        .from("escolhas")
        .select(`
          id,
          atividade_id,
          atividades (
            id,
            tipo,
            data,
            horario_inicio,
            horario_fim,
            local
          )
        `)
        .eq("user_id", session.user.id);

      setMinhasEscolhas(escolhasData as any || []);

      // Buscar trocas pendentes (solicitadas por mim ou para mim)
      const { data: trocasData } = await supabase
        .from("trocas")
        .select(`
          id,
          status,
          created_at,
          solicitante_id,
          receptor_id,
          atividade_origem_id,
          atividade_destino_id,
          solicitante:profiles!trocas_solicitante_id_fkey (
            nome_completo
          ),
          receptor:profiles!trocas_receptor_id_fkey (
            nome_completo
          ),
          atividade_origem:atividades!trocas_atividade_origem_id_fkey (
            tipo,
            data,
            horario_inicio,
            horario_fim
          ),
          atividade_destino:atividades!trocas_atividade_destino_id_fkey (
            tipo,
            data,
            horario_inicio,
            horario_fim
          )
        `)
        .or(`solicitante_id.eq.${session.user.id},receptor_id.eq.${session.user.id}`)
        .eq("status", "pendente");

      setTrocas(trocasData as any || []);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setLoading(false);
    }
  };

  const buscarParticipantesComAtividade = async (tipoAtividade: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("escolhas")
      .select(`
        user_id,
        atividade_id,
        profiles (
          id,
          nome_completo
        ),
        atividades (
          id,
          tipo,
          data,
          horario_inicio,
          horario_fim
        )
      `)
      .eq("atividades.tipo", tipoAtividade)
      .neq("user_id", session.user.id);

    setParticipantesComAtividade(data || []);
  };

  const solicitarTroca = async () => {
    if (!atividadeOrigem || !atividadeDestino || !receptorId) {
      toast({
        title: "Erro",
        description: "Selecione todas as opções",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("trocas")
      .insert({
        solicitante_id: session.user.id,
        receptor_id: receptorId,
        atividade_origem_id: atividadeOrigem,
        atividade_destino_id: atividadeDestino,
        status: "pendente",
      });

    if (error) {
      toast({
        title: "Erro ao solicitar troca",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Troca solicitada!",
        description: "O participante será notificado da sua solicitação.",
      });
      setDialogOpen(false);
      setAtividadeOrigem("");
      setAtividadeDestino("");
      setReceptorId("");
      fetchData();
    }
  };

  const responderTroca = async (trocaId: string, aceitar: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (aceitar) {
      // Buscar detalhes da troca
      const { data: troca } = await supabase
        .from("trocas")
        .select("*")
        .eq("id", trocaId)
        .single();

      if (!troca) return;

      // Atualizar as escolhas
      await supabase
        .from("escolhas")
        .update({ atividade_id: troca.atividade_destino_id })
        .eq("user_id", troca.solicitante_id)
        .eq("atividade_id", troca.atividade_origem_id);

      await supabase
        .from("escolhas")
        .update({ atividade_id: troca.atividade_origem_id })
        .eq("user_id", troca.receptor_id)
        .eq("atividade_id", troca.atividade_destino_id);
    }

    const { error } = await supabase
      .from("trocas")
      .update({ status: aceitar ? "aceita" : "recusada" })
      .eq("id", trocaId);

    if (error) {
      toast({
        title: "Erro ao responder troca",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: aceitar ? "Troca aceita!" : "Troca recusada",
        description: aceitar ? "As atividades foram trocadas com sucesso." : "A solicitação foi recusada.",
      });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline">Pendente</Badge>;
      case "aceita":
        return <Badge variant="default">Aceita</Badge>;
      case "recusada":
        return <Badge variant="destructive">Recusada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Trocas</CardTitle>
          <CardDescription>
            Solicite ou aceite trocas de atividades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sistema de Trocas</CardTitle>
        <CardDescription>
          Solicite ou aceite trocas de atividades com outros participantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Solicitar Nova Troca
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Troca de Atividade</DialogTitle>
              <DialogDescription>
                Selecione qual atividade você quer trocar e com quem
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Minha Atividade</label>
                <Select
                  value={atividadeOrigem}
                  onValueChange={(value) => {
                    setAtividadeOrigem(value);
                    const escolha = minhasEscolhas.find(e => e.atividade_id === value);
                    if (escolha) {
                      buscarParticipantesComAtividade(escolha.atividades.tipo);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua atividade" />
                  </SelectTrigger>
                  <SelectContent>
                    {minhasEscolhas.map((escolha) => (
                      <SelectItem key={escolha.atividade_id} value={escolha.atividade_id}>
                        {escolha.atividades.tipo} - {format(new Date(escolha.atividades.data), "dd/MM/yyyy", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {atividadeOrigem && participantesComAtividade.length > 0 && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Participante</label>
                    <Select
                      value={receptorId}
                      onValueChange={(value) => {
                        setReceptorId(value);
                        setAtividadeDestino("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o participante" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(participantesComAtividade.map(p => p.user_id))).map((userId) => {
                          const participante = participantesComAtividade.find(p => p.user_id === userId);
                          return (
                            <SelectItem key={userId} value={userId}>
                              {participante?.profiles?.nome_completo}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {receptorId && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Atividade do Participante</label>
                      <Select value={atividadeDestino} onValueChange={setAtividadeDestino}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a atividade" />
                        </SelectTrigger>
                        <SelectContent>
                          {participantesComAtividade
                            .filter(p => p.user_id === receptorId)
                            .map((p) => (
                              <SelectItem key={p.atividade_id} value={p.atividade_id}>
                                {p.atividades.tipo} - {format(new Date(p.atividades.data), "dd/MM/yyyy", { locale: ptBR })}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <Button onClick={solicitarTroca} className="w-full" disabled={!atividadeOrigem || !atividadeDestino || !receptorId}>
                Solicitar Troca
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {trocas.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhuma solicitação de troca pendente
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitante</TableHead>
                <TableHead>Atividade Oferecida</TableHead>
                <TableHead>Atividade Desejada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trocas.map((troca) => (
                <TrocaRow
                  key={troca.id}
                  troca={troca}
                  onResponder={responderTroca}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
