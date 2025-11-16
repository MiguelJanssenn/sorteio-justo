import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { TiposAtividadeManager } from "./TiposAtividadeManager";
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
  descricao: string | null;
  meses_recomendados: string[] | null;
  num_subgrupos: number;
  tem_rotacao: boolean;
  ativo: boolean;
  created_at: string;
}

export function ModelosManager() {
  const [modelos, setModelos] = useState<ModeloEstagio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloEstagio | null>(null);
  const [deletingModeloId, setDeletingModeloId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("");

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    meses_recomendados: "",
    num_subgrupos: 1,
    tem_rotacao: false,
    ativo: true,
  });

  useEffect(() => {
    fetchModelos();
  }, []);

  const fetchModelos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("modelos_estagio")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModelos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar modelos:", error);
      toast.error("Erro ao carregar modelos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (modelo?: ModeloEstagio) => {
    if (modelo) {
      setEditingModelo(modelo);
      setFormData({
        nome: modelo.nome,
        descricao: modelo.descricao || "",
        meses_recomendados: modelo.meses_recomendados?.join(", ") || "",
        num_subgrupos: modelo.num_subgrupos,
        tem_rotacao: modelo.tem_rotacao,
        ativo: modelo.ativo,
      });
    } else {
      setEditingModelo(null);
      setFormData({
        nome: "",
        descricao: "",
        meses_recomendados: "",
        num_subgrupos: 1,
        tem_rotacao: false,
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do modelo é obrigatório");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const mesesArray = formData.meses_recomendados
        .split(",")
        .map(m => m.trim())
        .filter(m => m.length > 0);

      const modeloData = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        meses_recomendados: mesesArray.length > 0 ? mesesArray : null,
        num_subgrupos: formData.num_subgrupos,
        tem_rotacao: formData.tem_rotacao,
        ativo: formData.ativo,
        created_by: user.id,
      };

      if (editingModelo) {
        const { error } = await supabase
          .from("modelos_estagio")
          .update(modeloData)
          .eq("id", editingModelo.id);

        if (error) throw error;
        toast.success("Modelo atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("modelos_estagio")
          .insert([modeloData]);

        if (error) throw error;
        toast.success("Modelo criado com sucesso!");
      }

      setDialogOpen(false);
      fetchModelos();
    } catch (error: any) {
      console.error("Erro ao salvar modelo:", error);
      toast.error("Erro ao salvar modelo: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingModeloId) return;

    try {
      const { error } = await supabase
        .from("modelos_estagio")
        .delete()
        .eq("id", deletingModeloId);

      if (error) throw error;

      toast.success("Modelo excluído com sucesso!");
      setDeleteDialogOpen(false);
      setDeletingModeloId(null);
      fetchModelos();
    } catch (error: any) {
      console.error("Erro ao excluir modelo:", error);
      toast.error("Erro ao excluir modelo: " + error.message);
    }
  };

  const openDeleteDialog = (modeloId: string) => {
    setDeletingModeloId(modeloId);
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

  return (
    <>
      <Tabs defaultValue="modelos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="modelos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Modelos de Estágio</CardTitle>
                  <CardDescription>
                    Gerencie os templates de estágios (Gastro/Pneumo, Neonatologia, DIP/PS, etc.)
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Modelo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {modelos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum modelo cadastrado ainda.</p>
                  <p className="text-sm mt-2">Clique em "Novo Modelo" para começar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modelos.map((modelo) => (
                    <div
                      key={modelo.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setModeloSelecionado(modelo.id);
                        // Switch to tipos tab when clicking a modelo
                        const tiposTab = document.querySelector('[value="tipos"]') as HTMLElement;
                        tiposTab?.click();
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{modelo.nome}</h3>
                          {!modelo.ativo && (
                            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                        {modelo.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{modelo.descricao}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Subgrupos: {modelo.num_subgrupos}</span>
                          <span>Rotação: {modelo.tem_rotacao ? "Sim" : "Não"}</span>
                          {modelo.meses_recomendados && (
                            <span>Meses: {modelo.meses_recomendados.join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(modelo)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(modelo.id)}
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
        </TabsContent>

        <TabsContent value="tipos">
          <TiposAtividadeManager 
            modelos={modelos} 
            modeloInicial={modeloSelecionado}
            onModeloChange={setModeloSelecionado}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModelo ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
            <DialogDescription>
              Configure o template de estágio com suas regras e características
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Modelo *</Label>
              <Input
                id="nome"
                placeholder="Ex: Gastro/Pneumo, Neonatologia, DIP/PS"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva as características principais deste estágio..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="meses">Meses Recomendados</Label>
              <Input
                id="meses"
                placeholder="Ex: março, setembro (separados por vírgula)"
                value={formData.meses_recomendados}
                onChange={(e) => setFormData({ ...formData, meses_recomendados: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separe múltiplos meses com vírgula
              </p>
            </div>

            <div>
              <Label htmlFor="subgrupos">Número de Subgrupos</Label>
              <Input
                id="subgrupos"
                type="number"
                min="1"
                max="10"
                value={formData.num_subgrupos}
                onChange={(e) => setFormData({ ...formData, num_subgrupos: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quantos subgrupos (G1, G2, G3, etc.) participam deste estágio
              </p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="rotacao">Tem Rotação de Especialidades</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Se os subgrupos trocam de especialidade durante o estágio
                </p>
              </div>
              <Switch
                id="rotacao"
                checked={formData.tem_rotacao}
                onCheckedChange={(checked) => setFormData({ ...formData, tem_rotacao: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="ativo">Modelo Ativo</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Se este modelo está disponível para uso
                </p>
              </div>
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
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
                "Salvar Modelo"
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
              Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.
              Todos os dados relacionados (tipos de atividades, configurações) também serão excluídos.
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