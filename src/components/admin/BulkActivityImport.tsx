import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, FileSpreadsheet } from "lucide-react";

interface ActivityRow {
  id: string;
  escala_id: string;
  tipo: string;
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

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const day = date.getDay();
    return day === 0 || day === 6;
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
        data: row.data,
        horario_inicio: row.horario_inicio,
        horario_fim: row.horario_fim,
        vagas_total: parseInt(row.vagas_total),
        observacao: row.observacao || null,
        eh_fim_semana: isWeekend(row.data),
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
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Cadastro em Massa
        </CardTitle>
        <CardDescription>
          Adicione múltiplas atividades de forma rápida usando a planilha editável
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Escala</TableHead>
                <TableHead className="w-[140px]">Tipo</TableHead>
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
                        <SelectItem value="Ambulatório">Ambulatório</SelectItem>
                        <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                      </SelectContent>
                    </Select>
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
      </CardContent>
    </Card>
  );
};
