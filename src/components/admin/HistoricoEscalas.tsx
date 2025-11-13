import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Escala {
  id: string;
  nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  created_at: string;
}

interface Escolha {
  user: { nome_completo: string };
  atividade: {
    tipo: string;
    data: string;
    horario_inicio: string;
    horario_fim: string;
    local: string | null;
  };
}

export const HistoricoEscalas = () => {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [escolhasPorEscala, setEscolhasPorEscala] = useState<Record<string, Escolha[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    setLoading(true);
    
    const { data: escalasData } = await supabase
      .from("escalas")
      .select("*")
      .eq("status", "finalizada")
      .order("created_at", { ascending: false });

    if (escalasData) {
      setEscalas(escalasData);
      
      // Fetch escolhas for each escala
      for (const escala of escalasData) {
        const { data: escolhasData } = await supabase
          .from("escolhas")
          .select(`
            user:profiles(nome_completo),
            atividade:atividades(tipo, data, horario_inicio, horario_fim, local)
          `)
          .eq("atividade.escala_id", escala.id);

        if (escolhasData) {
          setEscolhasPorEscala(prev => ({
            ...prev,
            [escala.id]: escolhasData as unknown as Escolha[]
          }));
        }
      }
    }
    
    setLoading(false);
  };

  const exportToExcel = (escala: Escala, escolhas: Escolha[]) => {
    const sortedEscolhas = [...escolhas].sort((a, b) => {
      const dateA = new Date(`${a.atividade.data}T${a.atividade.horario_inicio}`);
      const dateB = new Date(`${b.atividade.data}T${b.atividade.horario_inicio}`);
      return dateA.getTime() - dateB.getTime();
    });

    const data = sortedEscolhas.map(e => ({
      Participante: e.user.nome_completo,
      Tipo: e.atividade.tipo,
      Data: format(new Date(e.atividade.data), "dd/MM/yyyy", { locale: ptBR }),
      "Horário Início": e.atividade.horario_inicio,
      "Horário Fim": e.atividade.horario_fim,
      Local: e.atividade.local || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Escala");
    XLSX.writeFile(wb, `Historico_${escala.nome.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportToPDF = (escala: Escala, escolhas: Escolha[]) => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`Histórico: ${escala.nome}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(escala.periodo_inicio), "dd/MM/yyyy")} - ${format(new Date(escala.periodo_fim), "dd/MM/yyyy")}`, 14, 22);

    const sortedEscolhas = [...escolhas].sort((a, b) => {
      const dateA = new Date(`${a.atividade.data}T${a.atividade.horario_inicio}`);
      const dateB = new Date(`${b.atividade.data}T${b.atividade.horario_inicio}`);
      return dateA.getTime() - dateB.getTime();
    });

    const tableData = sortedEscolhas.map(e => [
      e.user.nome_completo,
      e.atividade.tipo,
      format(new Date(e.atividade.data), "dd/MM/yyyy"),
      e.atividade.horario_inicio,
      e.atividade.horario_fim,
      e.atividade.local || "-"
    ]);

    autoTable(doc, {
      head: [["Participante", "Tipo", "Data", "Início", "Fim", "Local"]],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 }
    });

    doc.save(`Historico_${escala.nome.replace(/\s+/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (escalas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Escalas</CardTitle>
          <CardDescription>Nenhuma escala finalizada encontrada</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Quando escalas forem finalizadas, elas aparecerão aqui para consulta.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Escalas</CardTitle>
        <CardDescription>Consulte escalas finalizadas anteriormente</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-3">
          {escalas.map((escala) => {
            const escolhas = escolhasPorEscala[escala.id] || [];
            const sortedEscolhas = [...escolhas].sort((a, b) => {
              const dateA = new Date(`${a.atividade.data}T${a.atividade.horario_inicio}`);
              const dateB = new Date(`${b.atividade.data}T${b.atividade.horario_inicio}`);
              return dateA.getTime() - dateB.getTime();
            });

            return (
              <AccordionItem key={escala.id} value={escala.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left w-full">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{escala.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(escala.periodo_inicio), "dd/MM/yyyy")} - {format(new Date(escala.periodo_fim), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {escolhas.length} escolhas
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToExcel(escala, escolhas)}
                        disabled={escolhas.length === 0}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(escala, escolhas)}
                        disabled={escolhas.length === 0}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>

                    {escolhas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma atividade escolhida nesta escala
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="pb-2 font-medium">Participante</th>
                              <th className="pb-2 font-medium">Tipo</th>
                              <th className="pb-2 font-medium">Data</th>
                              <th className="pb-2 font-medium">Horário</th>
                              <th className="pb-2 font-medium">Local</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {sortedEscolhas.map((escolha, idx) => (
                              <tr key={idx} className="text-muted-foreground">
                                <td className="py-2">{escolha.user.nome_completo}</td>
                                <td className="py-2">
                                  <Badge variant="outline">{escolha.atividade.tipo}</Badge>
                                </td>
                                <td className="py-2">
                                  {format(new Date(escolha.atividade.data), "dd/MM/yyyy", { locale: ptBR })}
                                </td>
                                <td className="py-2">
                                  {escolha.atividade.horario_inicio} - {escolha.atividade.horario_fim}
                                </td>
                                <td className="py-2">{escolha.atividade.local || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
};
