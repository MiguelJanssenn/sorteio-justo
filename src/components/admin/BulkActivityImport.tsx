import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export const BulkActivityImport = ({ onSuccess }: { onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        escala_id: "UUID da escala",
        tipo: "Plantão/Ambulatório/Enfermaria",
        data: "YYYY-MM-DD",
        horario_inicio: "HH:MM",
        horario_fim: "HH:MM",
        vagas_total: 1,
        observacao: "Observação (opcional)"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atividades");
    XLSX.writeFile(wb, "template_atividades.xlsx");

    toast({
      title: "Template baixado!",
      description: "Preencha a planilha e faça o upload.",
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

      const activities = jsonData.map((row: any) => ({
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
        title: "Atividades importadas!",
        description: `${activities.length} atividades foram adicionadas com sucesso.`,
      });

      onSuccess();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Importação em Massa
        </CardTitle>
        <CardDescription>
          Importe múltiplas atividades de uma planilha Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-semibold">Instruções:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Baixe o modelo de planilha</li>
            <li>Preencha com os dados das atividades</li>
            <li>Tipos válidos: Plantão, Ambulatório, Enfermaria</li>
            <li>Formato de data: AAAA-MM-DD (ex: 2024-12-25)</li>
            <li>Formato de horário: HH:MM (ex: 08:00)</li>
            <li>Faça o upload do arquivo preenchido</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
