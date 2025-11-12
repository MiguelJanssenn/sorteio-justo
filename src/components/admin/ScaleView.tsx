import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, List, Filter, Download, FileText, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Escolha {
  id: string;
  user_id: string;
  atividade_id: string;
  profiles: { nome_completo: string };
  atividades: {
    tipo: string;
    local: string | null;
    data: string;
    horario_inicio: string;
    horario_fim: string;
    observacao: string | null;
    escalas: { nome: string };
  };
}

export const ScaleView = () => {
  const [escolhas, setEscolhas] = useState<Escolha[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEscala, setSelectedEscala] = useState<string>("all");
  const [selectedParticipante, setSelectedParticipante] = useState<string>("all");
  const [selectedTipo, setSelectedTipo] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [escolhasRes, escalasRes, participantesRes] = await Promise.all([
      supabase
        .from("escolhas")
        .select(`
          *,
          profiles!inner(nome_completo),
          atividades!inner(
            tipo,
            local,
            data,
            horario_inicio,
            horario_fim,
            observacao,
            escalas!inner(nome)
          )
        `)
        .order("atividades(data)", { ascending: true }),
      supabase
        .from("escalas")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, nome_completo")
        .order("nome_completo")
    ]);

    if (escolhasRes.data) setEscolhas(escolhasRes.data as any);
    if (escalasRes.data) setEscalas(escalasRes.data);
    if (participantesRes.data) setParticipantes(participantesRes.data);
    
    setLoading(false);
  };

  const exportToExcel = () => {
    // Ordenar por data cronologicamente
    const sortedData = [...filteredEscolhas].sort((a, b) => {
      const dateA = new Date(a.atividades.data);
      const dateB = new Date(b.atividades.data);
      return dateA.getTime() - dateB.getTime();
    });

    const dataForExport = sortedData.map(escolha => ({
      Participante: escolha.profiles.nome_completo,
      Tipo: escolha.atividades.tipo,
      Local: escolha.atividades.local || "-",
      Data: format(new Date(escolha.atividades.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }),
      Horário: `${escolha.atividades.horario_inicio} - ${escolha.atividades.horario_fim}`,
      Escala: escolha.atividades.escalas.nome,
      Observação: escolha.atividades.observacao || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Escala");
    
    const fileName = `escala_${format(new Date(), "dd-MM-yyyy_HH-mm", { locale: ptBR })}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Ordenar por data cronologicamente
    const sortedData = [...filteredEscolhas].sort((a, b) => {
      const dateA = new Date(a.atividades.data);
      const dateB = new Date(b.atividades.data);
      return dateA.getTime() - dateB.getTime();
    });

    const tableData = sortedData.map(escolha => [
      escolha.profiles.nome_completo,
      escolha.atividades.tipo,
      escolha.atividades.local || "-",
      format(new Date(escolha.atividades.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }),
      `${escolha.atividades.horario_inicio} - ${escolha.atividades.horario_fim}`,
      escolha.atividades.escalas.nome,
      escolha.atividades.observacao || "-"
    ]);

    doc.setFontSize(16);
    doc.text("Escala de Atividades", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Participante", "Tipo", "Local", "Data", "Horário", "Escala", "Observação"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 22 },
        4: { cellWidth: 28 },
        5: { cellWidth: 25 },
        6: { cellWidth: 35 }
      },
      margin: { top: 28 }
    });

    const fileName = `escala_${format(new Date(), "dd-MM-yyyy_HH-mm", { locale: ptBR })}.pdf`;
    doc.save(fileName);
  };

  const filteredEscolhas = escolhas.filter(escolha => {
    if (selectedEscala !== "all" && escolha.atividades.escalas.nome !== selectedEscala) return false;
    if (selectedParticipante !== "all" && escolha.user_id !== selectedParticipante) return false;
    if (selectedTipo !== "all" && escolha.atividades.tipo !== selectedTipo) return false;
    if (selectedMonth) {
      const dataAtividade = escolha.atividades.data;
      if (!dataAtividade.startsWith(selectedMonth)) return false;
    }
    return true;
  });

  const groupedByDate = filteredEscolhas.reduce((acc, escolha) => {
    const date = escolha.atividades.data;
    if (!acc[date]) acc[date] = [];
    acc[date].push(escolha);
    return acc;
  }, {} as Record<string, Escolha[]>);

  const groupedByParticipant = filteredEscolhas.reduce((acc, escolha) => {
    const participante = escolha.profiles.nome_completo;
    if (!acc[participante]) acc[participante] = [];
    acc[participante].push(escolha);
    return acc;
  }, {} as Record<string, Escolha[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Visualização da Escala
        </CardTitle>
        <CardDescription>
          Veja todas as atividades alocadas com filtros personalizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <Filter className="w-4 h-4" />
          <span className="font-semibold text-sm">Filtros:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Escala</label>
            <Select value={selectedEscala} onValueChange={setSelectedEscala}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escalas</SelectItem>
                {escalas.map((escala) => (
                  <SelectItem key={escala.id} value={escala.nome}>
                    {escala.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Participante</label>
            <Select value={selectedParticipante} onValueChange={setSelectedParticipante}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os participantes</SelectItem>
                {participantes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Atividade</label>
            <Select value={selectedTipo} onValueChange={setSelectedTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Plantão">Plantão</SelectItem>
                <SelectItem value="Bloco">Bloco</SelectItem>
                <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                <SelectItem value="Ambulatório">Ambulatório</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Mês</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="table">
              <List className="w-4 h-4 mr-2" />
              Tabela
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Por Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            {filteredEscolhas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma atividade alocada com os filtros selecionados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participante</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Escala</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEscolhas.map((escolha) => (
                      <TableRow key={escolha.id}>
                        <TableCell className="font-medium">
                          {escolha.profiles.nome_completo}
                        </TableCell>
                        <TableCell>{escolha.atividades.tipo}</TableCell>
                        <TableCell>{escolha.atividades.local || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(escolha.atividades.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {escolha.atividades.horario_inicio} - {escolha.atividades.horario_fim}
                        </TableCell>
                        <TableCell>{escolha.atividades.escalas.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {escolha.atividades.observacao || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            {filteredEscolhas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma atividade alocada com os filtros selecionados
              </div>
            ) : (
              Object.entries(groupedByDate).map(([date, escolhas]) => (
                <Card key={date}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {format(new Date(date + "T00:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {escolhas.map((escolha) => (
                        <div
                          key={escolha.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{escolha.profiles.nome_completo}</div>
                            <div className="text-sm text-muted-foreground">
                              {escolha.atividades.tipo}
                              {escolha.atividades.local && ` • ${escolha.atividades.local}`}
                              {" • "}
                              {escolha.atividades.horario_inicio} - {escolha.atividades.horario_fim}
                            </div>
                            {escolha.atividades.observacao && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {escolha.atividades.observacao}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {escolha.atividades.escalas.nome}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Total: {filteredEscolhas.length} atividade(s) alocada(s)
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={filteredEscolhas.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToPDF}
              disabled={filteredEscolhas.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={fetchData}>
              Atualizar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
