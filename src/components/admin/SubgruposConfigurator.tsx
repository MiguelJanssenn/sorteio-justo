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

interface PeriodoRotacao {
  numero_periodo: number;
  data_inicio: string;
  data_fim: string;
  descricao: string;
}

export function SubgruposConfigurator() {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [selectedEscala, setSelectedEscala] = useState<string>("");
  const [subgrupos, setSubgrupos] = useState<SubgrupoConfig[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoRotacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEscalas();
  }, []);

  useEffect(() => {
    if (selectedEscala) {
      fetchDadosEscala();
    }
  }, [selectedEscala]);

  const fetchEscalas = async () => {
    try {
      const { data, error } = await supabase
        .from("escalas")
        .select("*, modelos_estagio(id, nome, num_subgrupos, tem_rotacao)")
        .eq("status", "ativa")
        .order("nome");

      if (error) throw error;
      setEscalas(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar escalas:", error);
      toast.error("Erro ao carregar escalas");
    }
  };

  const fetchDadosEscala = async () => {
    try {
      setLoading(true);
      const escala = escalas.find(e => e.id === selectedEscala);
      if (!escala || !escala.modelo_id) {
        toast.error("Escala não tem modelo associado");
        return;
      }

      // Buscar subgrupos do modelo
      const { data: dataSubgrupos, error: errorSubgrupos } = await supabase
        .from("configuracao_subgrupos")
        .select("*")
        .eq("modelo_id", escala.modelo_id)
        .order("ordem");

      if (errorSubgrupos) throw errorSubgrupos;

      if (dataSubgrupos && dataSubgrupos.length > 0) {
        setSubgrupos(dataSubgrupos);
      } else {
        // Criar subgrupos padrão
        const defaultSubgrupos: SubgrupoConfig[] = [];
        const numSubgrupos = escala.modelos_estagio?.num_subgrupos || 1;
        for (let i = 1; i <= numSubgrupos; i++) {
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

      // Buscar períodos de rotação da escala
      const { data: dataPeriodos, error: errorPeriodos } = await supabase
        .from("periodos_rotacao")
        .select("*")
        .eq("escala_id", selectedEscala)
        .order("numero_periodo");

      if (errorPeriodos) throw errorPeriodos;

      const temRotacao = escala.modelos_estagio?.tem_rotacao || false;
      if (dataPeriodos && dataPeriodos.length > 0) {
        setPeriodos(dataPeriodos);
      } else if (temRotacao) {
        // Criar períodos padrão
        const numPeriodos = escala.modelos_estagio?.num_subgrupos || 2;
        const defaultPeriodos: PeriodoRotacao[] = [];
        for (let i = 1; i <= numPeriodos; i++) {
          defaultPeriodos.push({
            numero_periodo: i,
            data_inicio: "",
            data_fim: "",
            descricao: `Período ${i}`
          });
        }
        setPeriodos(defaultPeriodos);
      } else {
        setPeriodos([]);
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar configuração");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEscala) {
      toast.error("Selecione uma escala primeiro");
      return;
    }

    try {
      setSaving(true);
      const escala = escalas.find(e => e.id === selectedEscala);
      if (!escala?.modelo_id) {
        toast.error("Escala não tem modelo associado");
        return;
      }

      // Deletar configurações existentes de subgrupos do modelo
      await supabase
        .from("configuracao_subgrupos")
        .delete()
        .eq("modelo_id", escala.modelo_id);

      // Inserir novas configurações de subgrupos
      const { error: errorSubgrupos } = await supabase
        .from("configuracao_subgrupos")
        .insert(
          subgrupos.map(s => ({
            modelo_id: escala.modelo_id,
            nome_subgrupo: s.nome_subgrupo,
            ordem: s.ordem,
            especialidade_periodo1: s.especialidade_periodo1 || null,
            especialidade_periodo2: s.especialidade_periodo2 || null,
            especialidade_periodo3: s.especialidade_periodo3 || null
          }))
        );

      if (errorSubgrupos) throw errorSubgrupos;

      // Se tem períodos de rotação, salvar
      if (periodos.length > 0) {
        // Deletar períodos existentes da escala
        await supabase
          .from("periodos_rotacao")
          .delete()
          .eq("escala_id", selectedEscala);

        // Inserir novos períodos
        const periodosValidos = periodos.filter(p => p.data_inicio && p.data_fim);
        if (periodosValidos.length > 0) {
          const { error: errorPeriodos } = await supabase
            .from("periodos_rotacao")
            .insert(
              periodosValidos.map(p => ({
                escala_id: selectedEscala,
                numero_periodo: p.numero_periodo,
                data_inicio: p.data_inicio,
                data_fim: p.data_fim,
                descricao: p.descricao
              }))
            );

          if (errorPeriodos) throw errorPeriodos;
        }
      }

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

  const updatePeriodo = (index: number, field: keyof PeriodoRotacao, value: string | number) => {
    const updated = [...periodos];
    updated[index] = { ...updated[index], [field]: value };
    setPeriodos(updated);
  };

  const selectedEscalaData = escalas.find(e => e.id === selectedEscala);
  const temRotacao = selectedEscalaData?.modelos_estagio?.tem_rotacao || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Subgrupos e Períodos de Rotação</CardTitle>
        <CardDescription>
          Configure os subgrupos do modelo e os períodos de rotação específicos da escala
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="escala">Escala</Label>
          <Select value={selectedEscala} onValueChange={setSelectedEscala}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a escala" />
            </SelectTrigger>
            <SelectContent>
              {escalas.map(escala => (
                <SelectItem key={escala.id} value={escala.id}>
                  {escala.nome} {escala.modelos_estagio?.nome ? `(${escala.modelos_estagio.nome})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEscala && (
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

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Subgrupos</h3>
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
                                placeholder="Ex: Gastro, DIP, PS"
                              />
                            </div>
                            <div>
                              <Label>Especialidade - Período 2</Label>
                              <Input
                                value={subgrupo.especialidade_periodo2}
                                onChange={(e) => updateSubgrupo(index, "especialidade_periodo2", e.target.value)}
                                placeholder="Ex: Pneumo, DIP, PS"
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
                </div>

                {temRotacao && periodos.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Períodos de Rotação</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure as datas de início e fim de cada período de rotação
                    </p>
                    {periodos.map((periodo, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <Label>Período</Label>
                              <Input
                                type="number"
                                value={periodo.numero_periodo}
                                onChange={(e) => updatePeriodo(index, "numero_periodo", parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Data Início</Label>
                              <Input
                                type="date"
                                value={periodo.data_inicio}
                                onChange={(e) => updatePeriodo(index, "data_inicio", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Data Fim</Label>
                              <Input
                                type="date"
                                value={periodo.data_fim}
                                onChange={(e) => updatePeriodo(index, "data_fim", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Descrição</Label>
                              <Input
                                value={periodo.descricao}
                                onChange={(e) => updatePeriodo(index, "descricao", e.target.value)}
                                placeholder="Ex: G1 na Gastro"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

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
