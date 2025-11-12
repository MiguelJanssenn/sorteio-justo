import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, ArrowUp, ArrowDown } from "lucide-react";

export const RulesConfig = () => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [escalaId, setEscalaId] = useState("");
  const [regras, setRegras] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Estados para as configurações
  const [fimSemanaObrigatorio, setFimSemanaObrigatorio] = useState(false);
  const [quotaAtividades, setQuotaAtividades] = useState(false);
  const [minAtividades, setMinAtividades] = useState("0");
  const [maxAtividades, setMaxAtividades] = useState("0");
  const [preenchimentoSequencial, setPreenchimentoSequencial] = useState(false);
  const [ordemPorTipo, setOrdemPorTipo] = useState(false);
  const [tiposOrdenados, setTiposOrdenados] = useState<string[]>(["Plantão", "Bloco", "Enfermaria", "Ambulatório"]);

  useEffect(() => {
    fetchEscalas();
  }, []);

  useEffect(() => {
    if (escalaId) {
      fetchRegras();
    }
  }, [escalaId]);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .eq("status", "ativa")
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const fetchRegras = async () => {
    const { data } = await supabase
      .from("regras")
      .select("*")
      .eq("escala_id", escalaId);
    
    if (data) {
      setRegras(data);
      
      // Carregar configurações existentes
      data.forEach(regra => {
        if (regra.tipo_regra === "fim_semana_obrigatorio") {
          setFimSemanaObrigatorio(regra.ativa);
        } else if (regra.tipo_regra === "quota_atividades") {
          setQuotaAtividades(regra.ativa);
          const config = regra.configuracao as any;
          setMinAtividades(config?.min?.toString() || "0");
          setMaxAtividades(config?.max?.toString() || "0");
        } else if (regra.tipo_regra === "preenchimento_sequencial") {
          setPreenchimentoSequencial(regra.ativa);
        } else if (regra.tipo_regra === "ordem_por_tipo") {
          setOrdemPorTipo(regra.ativa);
          const config = regra.configuracao as any;
          if (config?.ordem && Array.isArray(config.ordem)) {
            setTiposOrdenados(config.ordem);
          }
        }
      });
    }
  };

  const salvarRegras = async () => {
    if (!escalaId) return;
    setLoading(true);

    try {
      // Deletar regras antigas
      await supabase.from("regras").delete().eq("escala_id", escalaId);

      // Inserir novas regras
      const novasRegras = [
        {
          escala_id: escalaId,
          tipo_regra: "fim_semana_obrigatorio",
          ativa: fimSemanaObrigatorio,
          configuracao: {}
        },
        {
          escala_id: escalaId,
          tipo_regra: "quota_atividades",
          ativa: quotaAtividades,
          configuracao: {
            min: parseInt(minAtividades),
            max: parseInt(maxAtividades)
          }
        },
        {
          escala_id: escalaId,
          tipo_regra: "preenchimento_sequencial",
          ativa: preenchimentoSequencial,
          configuracao: {}
        },
        {
          escala_id: escalaId,
          tipo_regra: "ordem_por_tipo",
          ativa: ordemPorTipo,
          configuracao: {
            ordem: tiposOrdenados
          }
        }
      ];

      const { error } = await supabase.from("regras").insert(novasRegras);

      if (error) throw error;

      toast({
        title: "Regras salvas!",
        description: "As configurações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar regras",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const moverTipo = (index: number, direcao: 'cima' | 'baixo') => {
    const novostipos = [...tiposOrdenados];
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
    
    if (novoIndex < 0 || novoIndex >= novostipos.length) return;
    
    [novostipos[index], novostipos[novoIndex]] = [novostipos[novoIndex], novostipos[index]];
    setTiposOrdenados(novostipos);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configurar Regras
        </CardTitle>
        <CardDescription>
          Defina as regras que serão aplicadas durante a escolha
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Escala</Label>
          <Select value={escalaId} onValueChange={setEscalaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a escala" />
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

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Fim de Semana Obrigatório</Label>
              <p className="text-sm text-muted-foreground">
                Participantes devem escolher pelo menos um plantão no fim de semana
              </p>
            </div>
            <Switch
              checked={fimSemanaObrigatorio}
              onCheckedChange={setFimSemanaObrigatorio}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3">
                <Label>Cota de Atividades</Label>
                <Switch
                  checked={quotaAtividades}
                  onCheckedChange={setQuotaAtividades}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Defina um número mínimo/máximo de atividades por participante
              </p>
              {quotaAtividades && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label className="text-xs">Mínimo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={minAtividades}
                      onChange={(e) => setMinAtividades(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Máximo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={maxAtividades}
                      onChange={(e) => setMaxAtividades(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Preenchimento Sequencial</Label>
              <p className="text-sm text-muted-foreground">
                Todas as datas devem ter pelo menos 1 pessoa antes de preencher a 2ª vaga
              </p>
            </div>
            <Switch
              checked={preenchimentoSequencial}
              onCheckedChange={setPreenchimentoSequencial}
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <Label>Ordem de Escolha por Tipo</Label>
                  <Switch
                    checked={ordemPorTipo}
                    onCheckedChange={setOrdemPorTipo}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Define uma sequência obrigatória: primeiro todos escolhem um tipo, depois outro
                </p>
              </div>
            </div>
            
            {ordemPorTipo && (
              <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                <Label className="text-sm font-medium">Ordem dos Tipos</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Defina a ordem em que os tipos devem ser escolhidos (primeiro no topo)
                </p>
                <div className="space-y-2">
                  {tiposOrdenados.map((tipo, index) => (
                    <div key={tipo} className="flex items-center justify-between bg-background p-3 rounded-md border">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}º
                        </span>
                        <span className="font-medium">{tipo}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moverTipo(index, 'cima')}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moverTipo(index, 'baixo')}
                          disabled={index === tiposOrdenados.length - 1}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Exemplo: Se a ordem for "Ambulatório → Bloco → Enfermaria → Plantão", 
                  todos devem escolher primeiro Ambulatório antes que alguém possa escolher Bloco.
                </p>
              </div>
            )}
          </div>
        </div>

        <Button onClick={salvarRegras} disabled={loading || !escalaId} className="w-full">
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
};
