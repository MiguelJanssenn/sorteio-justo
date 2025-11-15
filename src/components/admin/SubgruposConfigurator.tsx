import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

interface SubgrupoConfig {
  id?: string;
  nome_subgrupo: string;
  ordem: number;
  especialidade_periodo1: string;
  especialidade_periodo2: string;
  especialidade_periodo3: string;
}

export function SubgruposConfigurator() {
  const [modelos, setModelos] = useState<any[]>([]);
  const [selectedModelo, setSelectedModelo] = useState<string>("");
  const [subgrupos, setSubgrupos] = useState<SubgrupoConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchModelos();
  }, []);

  useEffect(() => {
    if (selectedModelo) {
      fetchSubgrupos();
    }
  }, [selectedModelo]);

  const fetchModelos = async () => {
    try {
      const { data, error } = await supabase
        .from("modelos_estagio")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setModelos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar modelos:", error);
      toast.error("Erro ao carregar modelos");
    }
  };

  const fetchSubgrupos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("configuracao_subgrupos")
        .select("*")
        .eq("modelo_id", selectedModelo)
        .order("ordem");

      if (error) throw error;

      const modelo = modelos.find(m => m.id === selectedModelo);
      
      if (data && data.length > 0) {
        setSubgrupos(data);
      } else if (modelo) {
        // Criar subgrupos padrão baseado no número configurado
        const defaultSubgrupos: SubgrupoConfig[] = [];
        for (let i = 1; i <= modelo.num_subgrupos; i++) {
          defaultSubgrupos.push({
            nome_subgrupo: `G${i}`,
            ordem: i,
            especialidade_periodo1: "",
            especialidade_periodo2: "",
            especialidade_periodo3: ""
          });
        }
        setSubgrupos(defaultSubgrupos);
      }
    } catch (error: any) {
      console.error("Erro ao buscar subgrupos:", error);
      toast.error("Erro ao carregar configuração");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedModelo) {
      toast.error("Selecione um modelo primeiro");
      return;
    }

    try {
      setSaving(true);

      // Deletar configurações existentes
      await supabase
        .from("configuracao_subgrupos")
        .delete()
        .eq("modelo_id", selectedModelo);

      // Inserir novas configurações
      const { error } = await supabase
        .from("configuracao_subgrupos")
        .insert(
          subgrupos.map(s => ({
            modelo_id: selectedModelo,
            nome_subgrupo: s.nome_subgrupo,
            ordem: s.ordem,
            especialidade_periodo1: s.especialidade_periodo1 || null,
            especialidade_periodo2: s.especialidade_periodo2 || null,
            especialidade_periodo3: s.especialidade_periodo3 || null
          }))
        );

      if (error) throw error;

      toast.success("Configuração salva com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSubgrupo = (index: number, field: keyof SubgrupoConfig, value: string) => {
    const updated = [...subgrupos];
    updated[index] = { ...updated[index], [field]: value };
    setSubgrupos(updated);
  };

  const selectedModeloData = modelos.find(m => m.id === selectedModelo);
  const temRotacao = selectedModeloData?.tem_rotacao || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Subgrupos e Rotações</CardTitle>
        <CardDescription>
          Configure os subgrupos e suas especialidades por período de rotação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="modelo">Modelo de Estágio</Label>
          <Select value={selectedModelo} onValueChange={setSelectedModelo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              {modelos.map(modelo => (
                <SelectItem key={modelo.id} value={modelo.id}>
                  {modelo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedModelo && (
          <>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {temRotacao ? (
                    <p>Este modelo tem rotação de especialidades entre períodos.</p>
                  ) : (
                    <p>Este modelo não tem rotação de especialidades.</p>
                  )}
                </div>

                {subgrupos.map((subgrupo, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nome do Subgrupo</Label>
                          <Input
                            value={subgrupo.nome_subgrupo}
                            onChange={(e) => updateSubgrupo(index, "nome_subgrupo", e.target.value)}
                            placeholder="Ex: G1, G2, G3"
                          />
                        </div>
                        <div>
                          <Label>Ordem</Label>
                          <Input
                            type="number"
                            value={subgrupo.ordem}
                            onChange={(e) => updateSubgrupo(index, "ordem", e.target.value)}
                          />
                        </div>
                      </div>

                      {temRotacao && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Especialidade - Período 1</Label>
                            <Input
                              value={subgrupo.especialidade_periodo1}
                              onChange={(e) => updateSubgrupo(index, "especialidade_periodo1", e.target.value)}
                              placeholder="Ex: Gastro, Pneumo"
                            />
                          </div>
                          <div>
                            <Label>Especialidade - Período 2</Label>
                            <Input
                              value={subgrupo.especialidade_periodo2}
                              onChange={(e) => updateSubgrupo(index, "especialidade_periodo2", e.target.value)}
                              placeholder="Ex: Gastro, Pneumo"
                            />
                          </div>
                          <div>
                            <Label>Especialidade - Período 3</Label>
                            <Input
                              value={subgrupo.especialidade_periodo3}
                              onChange={(e) => updateSubgrupo(index, "especialidade_periodo3", e.target.value)}
                              placeholder="Ex: DIP, PS"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configuração
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
