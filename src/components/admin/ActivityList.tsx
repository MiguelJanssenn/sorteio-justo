import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, List } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Atividade {
  id: string;
  escala_id: string;
  tipo: string;
  local: string | null;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  vagas_total: number;
  vagas_ocupadas: number;
  observacao: string | null;
  eh_fim_semana: boolean;
}

export const ActivityList = ({ refreshKey }: { refreshKey: number }) => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [selectedEscalaId, setSelectedEscalaId] = useState("");
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
  }, [refreshKey]);

  useEffect(() => {
    if (selectedEscalaId) {
      fetchAtividades();
    }
  }, [selectedEscalaId, refreshKey]);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const fetchAtividades = async () => {
    if (!selectedEscalaId) return;

    const { data, error } = await supabase
      .from("atividades")
      .select("*")
      .eq("escala_id", selectedEscalaId)
      .order("data", { ascending: true })
      .order("horario_inicio", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar atividades",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setAtividades(data || []);
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleEdit = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtividade) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("atividades")
        .update({
          tipo: editingAtividade.tipo,
          local: editingAtividade.local || null,
          data: editingAtividade.data,
          horario_inicio: editingAtividade.horario_inicio,
          horario_fim: editingAtividade.horario_fim,
          vagas_total: editingAtividade.vagas_total,
          observacao: editingAtividade.observacao || null,
          eh_fim_semana: isWeekend(editingAtividade.data),
        })
        .eq("id", editingAtividade.id);

      if (error) throw error;

      toast({
        title: "Atividade atualizada!",
        description: "A atividade foi atualizada com sucesso.",
      });

      setEditDialogOpen(false);
      setEditingAtividade(null);
      await fetchAtividades();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar atividade",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (atividadeId: string) => {
    setLoading(true);

    try {
      // Check if there are escolhas for this activity
      const { data: escolhas } = await supabase
        .from("escolhas")
        .select("id")
        .eq("atividade_id", atividadeId)
        .limit(1);

      if (escolhas && escolhas.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Esta atividade já possui participantes inscritos.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("atividades")
        .delete()
        .eq("id", atividadeId);

      if (error) throw error;

      toast({
        title: "Atividade excluída!",
        description: "A atividade foi removida com sucesso.",
      });

      await fetchAtividades();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir atividade",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            Gerenciar Atividades
          </CardTitle>
          <CardDescription>
            Visualize e edite atividades cadastradas em cada escala
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="escala-select">Selecione a Escala</Label>
            <Select value={selectedEscalaId} onValueChange={setSelectedEscalaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma escala" />
              </SelectTrigger>
              <SelectContent>
                {escalas.map((escala) => (
                  <SelectItem key={escala.id} value={escala.id}>
                    {escala.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEscalaId && atividades.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Vagas</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atividades.map((atividade) => (
                    <TableRow key={atividade.id}>
                      <TableCell className="font-medium">{atividade.tipo}</TableCell>
                      <TableCell>
                        {format(new Date(atividade.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {atividade.horario_inicio} - {atividade.horario_fim}
                      </TableCell>
                      <TableCell>{atividade.local || "-"}</TableCell>
                      <TableCell>
                        {atividade.vagas_ocupadas}/{atividade.vagas_total}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(atividade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(atividade.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedEscalaId && atividades.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma atividade cadastrada para esta escala.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
            <DialogDescription>
              Atualize as informações da atividade
            </DialogDescription>
          </DialogHeader>
          {editingAtividade && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-tipo">Tipo de Atividade</Label>
                <Select
                  value={editingAtividade.tipo}
                  onValueChange={(value) =>
                    setEditingAtividade({ ...editingAtividade, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plantão">Plantão</SelectItem>
                    <SelectItem value="Bloco">Bloco</SelectItem>
                    <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                    <SelectItem value="Ambulatório">Ambulatório</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-local">Local</Label>
                <Input
                  id="edit-local"
                  value={editingAtividade.local || ""}
                  onChange={(e) =>
                    setEditingAtividade({ ...editingAtividade, local: e.target.value })
                  }
                  placeholder="Ex: Hospital Central, Pronto Socorro..."
                />
              </div>

              <div>
                <Label htmlFor="edit-data">Data</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editingAtividade.data}
                  onChange={(e) =>
                    setEditingAtividade({ ...editingAtividade, data: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-inicio">Horário Início</Label>
                  <Input
                    id="edit-inicio"
                    type="time"
                    value={editingAtividade.horario_inicio}
                    onChange={(e) =>
                      setEditingAtividade({ ...editingAtividade, horario_inicio: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-fim">Horário Fim</Label>
                  <Input
                    id="edit-fim"
                    type="time"
                    value={editingAtividade.horario_fim}
                    onChange={(e) =>
                      setEditingAtividade({ ...editingAtividade, horario_fim: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-vagas">Número de Vagas</Label>
                <Input
                  id="edit-vagas"
                  type="number"
                  min="1"
                  value={editingAtividade.vagas_total}
                  onChange={(e) =>
                    setEditingAtividade({
                      ...editingAtividade,
                      vagas_total: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-observacao">Observação</Label>
                <Textarea
                  id="edit-observacao"
                  value={editingAtividade.observacao || ""}
                  onChange={(e) =>
                    setEditingAtividade({ ...editingAtividade, observacao: e.target.value })
                  }
                  placeholder="Adicione informações extras sobre a atividade..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingAtividade(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingId !== null} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.
              {"\n\n"}
              Nota: Só é possível excluir atividades sem participantes inscritos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
