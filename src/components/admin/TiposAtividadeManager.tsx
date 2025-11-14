import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ModeloEstagio {
  id: string;
  nome: string;
}

interface TipoAtividade {
  id: string;
  modelo_id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  modo_participacao: string;
  vagas_por_slot: number;
  quota_minima: number | null;
  quota_maxima: number | null;
  permite_fim_semana: boolean;
  permite_feriado: boolean;
  horario_inicio: string | null;
  horario_fim: string | null;
  cor_dashboard: string | null;
  ordem_exibicao: number;
}

export function TiposAtividadeManager() {
  const [modelos, setModelos] = useState<ModeloEstagio[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("");
  const [tipos, setTipos] = useState<TipoAtividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoAtividade | null>(null);
  const [deletingTipoId, setDeletingTipoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    codigo: "",
    descricao: "",
    modo_participacao: "sozinho",
    vagas_por_slot: 1,
    quota_minima: "",
    quota_maxima: "",
    permite_fim_semana: true,
    permite_feriado: true,
    horario_inicio: "",
    horario_fim: "",
    cor_dashboard: "#3b82f6",
    ordem_exibicao: 0,
  });

  useEffect(() => {
    fetchModelos();
  }, []);

  useEffect(() => {
    if (modeloSelecionado) {
      fetchTiposAtividade();
    }
  }, [modeloSelecionado]);

  const fetchModelos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("modelos_estagio")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setModelos(data || []);

      if (data && data.length > 0 && !modeloSelecionado) {
        setModeloSelecionado(data[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao buscar modelos:", error);
      toast.error("Erro ao carregar modelos");
    } finally {
      setLoading(false);
    }
  };

  const fetchTiposAtividade = async () => {
    if (!modeloSelecionado) return;

    try {
      const { data, error } = await supabase
        .from("tipos_atividade_modelo")
        .select("*")
        .eq("modelo_id", modeloSelecionado)
        .order("ordem_exibicao");

      if (error) throw error;
      setTipos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar tipos de atividade:", error);
      toast.error("Erro ao carregar tipos de atividade");
    }
  };

  const handleOpenDialog = (tipo?: TipoAtividade) => {
    if (tipo) {
      setEditingTipo(tipo);
      setFormData({
        nome: tipo.nome,
        codigo: tipo.codigo,
        descricao: tipo.descricao || "",
        modo_participacao: tipo.modo_participacao,
        vagas_por_slot: tipo.vagas_por_slot,
        quota_minima: tipo.quota_minima?.toString() || "",
        quota_maxima: tipo.quota_maxima?.toString() || "",
        permite_fim_semana: tipo.permite_fim_semana,
        permite_feriado: tipo.permite_feriado,
        horario_inicio: tipo.horario_inicio || "",
        horario_fim: tipo.horario_fim || "",
        cor_dashboard: tipo.cor_dashboard || "#3b82f6",
        ordem_exibicao: tipo.ordem_exibicao,
      });
    } else {
      setEditingTipo(null);
      setFormData({
        nome: "",
        codigo: "",
        descricao: "",
        modo_participacao: "sozinho",
        vagas_por_slot: 1,
        quota_minima: "",
        quota_maxima: "",
        permite_fim_semana: true,
        permite_feriado: true,
        horario_inicio: "",
        horario_fim: "",
        cor_dashboard: "#3b82f6",
        ordem_exibicao: tipos.length,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do tipo de atividade é obrigatório");
      return;
    }

    if (!formData.codigo.trim()) {
      toast.error("Código é obrigatório");
      return;
    }

    try {
      setSaving(true);

      const tipoData = {
        modelo_id: modeloSelecionado,
        nome: formData.nome.trim(),
        codigo: formData.codigo.trim().toLowerCase().replace(/\s+/g, "_"),
        descricao: formData.descricao.trim() || null,
        modo_participacao: formData.modo_participacao,
        vagas_por_slot: formData.vagas_por_slot,
        quota_minima: formData.quota_minima ? parseInt(formData.quota_minima) : null,
        quota_maxima: formData.quota_maxima ? parseInt(formData.quota_maxima) : null,
        permite_fim_semana: formData.permite_fim_semana,
        permite_feriado: formData.permite_feriado,
        horario_inicio: formData.horario_inicio || null,
        horario_fim: formData.horario_fim || null,
        cor_dashboard: formData.cor_dashboard,
        ordem_exibicao: formData.ordem_exibicao,
      };

      if (editingTipo) {
        const { error } = await supabase
          .from("tipos_atividade_modelo")
          .update(tipoData)
          .eq("id", editingTipo.id);

        if (error) throw error;
        toast.success("Tipo de atividade atualizado!");
      } else {
        const { error } = await supabase
          .from("tipos_atividade_modelo")
          .insert([tipoData]);

        if (error) throw error;
        toast.success("Tipo de atividade criado!");
      }

      setDialogOpen(false);
      fetchTiposAtividade();
    } catch (error: any) {
      console.error("Erro ao salvar tipo:", error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTipoId) return;

    try {
      const { error } = await supabase
        .from("tipos_atividade_modelo")
        .delete()
        .eq("id", deletingTipoId);

      if (error) throw error;

      toast.success("Tipo de atividade excluído!");
      setDeleteDialogOpen(false);
      setDeletingTipoId(null);
      fetchTiposAtividade();
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const openDeleteDialog = (tipoId: string) => {
    setDeletingTipoId(tipoId);
    setDeleteDialogOpen(true);
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

  if (modelos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">
            Primeiro, crie pelo menos um modelo de estágio na aba "Modelos".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Tipos de Atividades</CardTitle>
              <CardDescription>
                Configure os tipos de atividades (slots) para cada modelo
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((modelo) => (
                    <SelectItem key={modelo.id} value={modelo.id}>
                      {modelo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Tipo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tipos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum tipo de atividade cadastrado para este modelo.</p>
              <p className="text-sm mt-2">Clique em "Novo Tipo" para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tipos.map((tipo) => (
                <div
                  key={tipo.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: tipo.cor_dashboard || "#3b82f6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{tipo.nome}</h3>
                      {tipo.descricao && (
                        <p className="text-sm text-muted-foreground truncate">{tipo.descricao}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="capitalize">{tipo.modo_participacao}</span>
                        <span>•</span>
                        <span>{tipo.vagas_por_slot} vaga(s) por slot</span>
                        {tipo.quota_minima && (
                          <>
                            <span>•</span>
                            <span>Quota: {tipo.quota_minima}{tipo.quota_maxima && `-${tipo.quota_maxima}`}</span>
                          </>
                        )}
                        {tipo.horario_inicio && tipo.horario_fim && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {tipo.horario_inicio} - {tipo.horario_fim}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(tipo)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(tipo.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? "Editar Tipo" : "Novo Tipo de Atividade"}
            </DialogTitle>
            <DialogDescription>
              Configure um tipo de atividade (slot) para este modelo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Plantão PS-CM"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  placeholder="Ex: plantao_ps"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usado internamente (sem espaços)
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva este tipo de atividade..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modo">Modo de Participação</Label>
                <Select
                  value={formData.modo_participacao}
                  onValueChange={(value) => setFormData({ ...formData, modo_participacao: value })}
                >
                  <SelectTrigger id="modo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sozinho">Sozinho</SelectItem>
                    <SelectItem value="dupla">Dupla</SelectItem>
                    <SelectItem value="grupo">Grupo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vagas">Vagas por Slot</Label>
                <Input
                  id="vagas"
                  type="number"
                  min="1"
                  value={formData.vagas_por_slot}
                  onChange={(e) => setFormData({ ...formData, vagas_por_slot: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quota_min">Quota Mínima</Label>
                <Input
                  id="quota_min"
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  value={formData.quota_minima}
                  onChange={(e) => setFormData({ ...formData, quota_minima: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="quota_max">Quota Máxima</Label>
                <Input
                  id="quota_max"
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  value={formData.quota_maxima}
                  onChange={(e) => setFormData({ ...formData, quota_maxima: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inicio">Horário Início</Label>
                <Input
                  id="inicio"
                  type="time"
                  value={formData.horario_inicio}
                  onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="fim">Horário Fim</Label>
                <Input
                  id="fim"
                  type="time"
                  value={formData.horario_fim}
                  onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cor">Cor no Dashboard</Label>
              <div className="flex gap-2">
                <Input
                  id="cor"
                  type="color"
                  className="w-20"
                  value={formData.cor_dashboard}
                  onChange={(e) => setFormData({ ...formData, cor_dashboard: e.target.value })}
                />
                <Input
                  value={formData.cor_dashboard}
                  onChange={(e) => setFormData({ ...formData, cor_dashboard: e.target.value })}
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="fds">Permite Fim de Semana</Label>
                <Switch
                  id="fds"
                  checked={formData.permite_fim_semana}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_fim_semana: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor="feriado">Permite Feriado</Label>
                <Switch
                  id="feriado"
                  checked={formData.permite_feriado}
                  onCheckedChange={(checked) => setFormData({ ...formData, permite_feriado: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tipo de atividade?
              Todas as atividades criadas com este tipo serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}