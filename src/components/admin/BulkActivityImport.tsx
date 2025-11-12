import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, FileSpreadsheet, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ActivityRow {
  id: string;
  escala_id: string;
  tipo: string;
  local: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  vagas_total: string;
  observacao: string;
}

export const BulkActivityImport = ({ onSuccess }: { onSuccess: () => void }) => {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEscalas();
    addEmptyRow();
  }, []);

  const fetchEscalas = async () => {
    const { data } = await supabase
      .from("escalas")
      .select("*")
      .eq("status", "ativa")
      .order("created_at", { ascending: false });
    
    if (data) setEscalas(data);
  };

  const addEmptyRow = () => {
    setRows(prev => [...prev, {
      id: crypto.randomUUID(),
      escala_id: "",
      tipo: "",
      local: "",
      data: "",
      horario_inicio: "",
      horario_fim: "",
      vagas_total: "1",
      observacao: ""
    }]);
  };

  const updateRow = (id: string, field: keyof ActivityRow, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const downloadTemplate = () => {
    const template = [
      {
        escala_id: escalas[0]?.id || "Cole aqui o ID da escala",
        tipo: "Plantão",
        local: "Hospital Central",
        data: "25/12/2024",
        horario_inicio: "08:00",
        horario_fim: "18:00",
        vagas_total: 1,
        observacao: "Observação opcional"
      }
    ];

    // Add a second sheet with available escalas
    const escalasSheet = escalas.map(e => ({
      id: e.id,
      nome: e.nome,
      periodo: `${e.periodo_inicio} a ${e.periodo_fim}`
    }));

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atividades");
    
    if (escalasSheet.length > 0) {
      const escalasWs = XLSX.utils.json_to_sheet(escalasSheet);
      XLSX.utils.book_append_sheet(wb, escalasWs, "Escalas Disponíveis");
    }
    
    XLSX.writeFile(wb, "template_atividades.xlsx");

    toast({
      title: "Template baixado!",
      description: "Veja a aba 'Escalas Disponíveis' para copiar o ID correto.",
    });
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Valid tipo values
      const validTipos = ['Plantão', 'Bloco', 'Enfermaria', 'Ambulatório'];

      const validActivities: any[] = [];
      const errors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        try {
          // Normalize tipo - trim and check if valid
          const tipoNormalized = String(row.tipo || '').trim();
          if (!validTipos.includes(tipoNormalized)) {
            throw new Error(`Tipo "${row.tipo}" inválido. Valores aceitos: Plantão, Bloco, Enfermaria, Ambulatório`);
          }

          // Handle different date formats (Excel can return dates as numbers or strings)
          let dataFormatted: string;
          
          if (typeof row.data === 'number') {
            // Excel date serial number
            const date = XLSX.SSF.parse_date_code(row.data);
            dataFormatted = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          } else if (typeof row.data === 'string') {
            // DD/MM/YYYY format
            const [day, month, year] = row.data.trim().split('/');
            if (!day || !month || !year) {
              throw new Error(`Formato de data inválido. Use DD/MM/AAAA (ex: 25/12/2024)`);
            }
            dataFormatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            throw new Error(`Formato de data inválido`);
          }

          // Handle time formats (Excel can return times as decimal numbers)
          const formatTime = (timeValue: any, fieldName: string): string => {
            if (typeof timeValue === 'number') {
              // Excel time as fraction of day (0.5 = 12:00)
              const totalMinutes = Math.round(timeValue * 24 * 60);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
            const timeStr = String(timeValue || '').trim();
            if (!timeStr || !timeStr.match(/^\d{1,2}:\d{2}$/)) {
              throw new Error(`Formato de ${fieldName} inválido. Use HH:MM (ex: 08:00)`);
            }
            return timeStr;
          };

          // Validate vagas_total
          const vagasTotal = parseInt(row.vagas_total);
          if (isNaN(vagasTotal) || vagasTotal < 1) {
            throw new Error(`vagas_total deve ser um número maior que 0`);
          }

          // Validate escala_id
          const escalaId = String(row.escala_id || '').trim();
          if (!escalaId) {
            throw new Error(`escala_id é obrigatório. Copie o ID da aba "Escalas Disponíveis"`);
          }

          validActivities.push({
            escala_id: escalaId,
            tipo: tipoNormalized,
            local: row.local ? String(row.local).trim() : null,
            data: dataFormatted,
            horario_inicio: formatTime(row.horario_inicio, 'horário de início'),
            horario_fim: formatTime(row.horario_fim, 'horário de fim'),
            vagas_total: vagasTotal,
            observacao: row.observacao ? String(row.observacao).trim() : null,
            vagas_ocupadas: 0
          });
        } catch (error: any) {
          errors.push(`Linha ${index + 2}: ${error.message}`);
        }
      });

      if (validActivities.length > 0) {
        const { error } = await supabase.from("atividades").insert(validActivities);
        if (error) throw error;
      }

      if (validActivities.length > 0 && errors.length === 0) {
        toast({
          title: "Atividades importadas!",
          description: `${validActivities.length} atividade(s) importada(s) com sucesso.`,
        });
      } else if (validActivities.length > 0 && errors.length > 0) {
        toast({
          title: "Importação parcial",
          description: `${validActivities.length} importadas com sucesso. ${errors.length} com erro(s). Corrija manualmente: ${errors.join('; ')}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Nenhuma atividade importada",
          description: `Todas as linhas têm erros: ${errors.join('; ')}`,
          variant: "destructive",
        });
      }

      if (validActivities.length > 0) {
        onSuccess();
      }
      e.target.value = "";
    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter(row => 
      row.escala_id && row.tipo && row.data && row.horario_inicio && row.horario_fim
    );

    if (validRows.length === 0) {
      toast({
        title: "Nenhuma atividade para salvar",
        description: "Preencha pelo menos uma linha completa.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const activities = validRows.map(row => ({
        escala_id: row.escala_id,
        tipo: row.tipo,
        local: row.local || null,
        data: row.data,
        horario_inicio: row.horario_inicio,
        horario_fim: row.horario_fim,
        vagas_total: parseInt(row.vagas_total),
        observacao: row.observacao || null,
        vagas_ocupadas: 0
      }));

      const { error } = await supabase.from("atividades").insert(activities);

      if (error) throw error;

      toast({
        title: "Atividades salvas!",
        description: `${activities.length} atividade(s) adicionada(s) com sucesso.`,
      });

      setRows([]);
      addEmptyRow();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Cadastro de Atividades
        </CardTitle>
        <CardDescription>
          Adicione múltiplas atividades usando planilha editável ou importação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="editavel" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editavel">Planilha Editável</TabsTrigger>
            <TabsTrigger value="importar">Importar Planilha</TabsTrigger>
          </TabsList>

          <TabsContent value="editavel" className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Escala</TableHead>
                <TableHead className="w-[140px]">Tipo</TableHead>
                <TableHead className="w-[140px]">Local</TableHead>
                <TableHead className="w-[140px]">Data</TableHead>
                <TableHead className="w-[100px]">Início</TableHead>
                <TableHead className="w-[100px]">Fim</TableHead>
                <TableHead className="w-[80px]">Vagas</TableHead>
                <TableHead className="min-w-[200px]">Observação</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Select value={row.escala_id} onValueChange={(value) => updateRow(row.id, 'escala_id', value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {escalas.map((escala) => (
                          <SelectItem key={escala.id} value={escala.id}>
                            {escala.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={row.tipo} onValueChange={(value) => updateRow(row.id, 'tipo', value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Plantão">Plantão</SelectItem>
                        <SelectItem value="Bloco">Bloco</SelectItem>
                        <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                        <SelectItem value="Ambulatório">Ambulatório</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={row.local}
                      onChange={(e) => updateRow(row.id, 'local', e.target.value)}
                      placeholder="Local..."
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.data}
                      onChange={(e) => updateRow(row.id, 'data', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={row.horario_inicio}
                      onChange={(e) => updateRow(row.id, 'horario_inicio', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={row.horario_fim}
                      onChange={(e) => updateRow(row.id, 'horario_fim', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={row.vagas_total}
                      onChange={(e) => updateRow(row.id, 'vagas_total', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={row.observacao}
                      onChange={(e) => updateRow(row.id, 'observacao', e.target.value)}
                      placeholder="Observação..."
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={addEmptyRow} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Linha
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Todas"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="importar" className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Modelo de Planilha
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="file-upload"
                  />
                  <Button
                    variant="default"
                    disabled={loading}
                    className="w-full"
                    asChild
                  >
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {loading ? "Importando..." : "Fazer Upload da Planilha"}
                    </label>
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-1 p-4 bg-muted rounded-lg">
                <p className="font-semibold">Instruções:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Baixe o modelo de planilha</li>
                  <li><strong>escala_id:</strong> Copie o ID da aba "Escalas Disponíveis"</li>
                  <li>Preencha com os dados das atividades no Excel</li>
                  <li>Tipos válidos: Plantão, Bloco, Enfermaria, Ambulatório</li>
                  <li>Formato de data: DD/MM/AAAA (ex: 25/12/2024) ou deixe o Excel formatar</li>
                  <li>Formato de horário: HH:MM (ex: 08:00)</li>
                  <li>Faça o upload do arquivo preenchido</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
